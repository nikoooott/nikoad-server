import express from 'express';
import session from 'express-session';
import bcrypt from 'bcryptjs';
import Database from 'better-sqlite3';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __dirname=path.dirname(fileURLToPath(import.meta.url));
const app=express();
const db=new Database(path.join(__dirname,'tver.db'));
fs.mkdirSync(path.join(__dirname,'public','uploads'),{recursive:true});

db.exec(`PRAGMA foreign_keys=ON;
CREATE TABLE IF NOT EXISTS users(id INTEGER PRIMARY KEY AUTOINCREMENT,username TEXT UNIQUE NOT NULL,password TEXT NOT NULL,name TEXT NOT NULL,bio TEXT DEFAULT '',avatar TEXT DEFAULT '');
CREATE TABLE IF NOT EXISTS posts(id INTEGER PRIMARY KEY AUTOINCREMENT,user_id INTEGER NOT NULL,caption TEXT DEFAULT '',image TEXT NOT NULL,created_at TEXT DEFAULT CURRENT_TIMESTAMP,FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS likes(user_id INTEGER NOT NULL,post_id INTEGER NOT NULL,PRIMARY KEY(user_id,post_id),FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,FOREIGN KEY(post_id) REFERENCES posts(id) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS comments(id INTEGER PRIMARY KEY AUTOINCREMENT,user_id INTEGER NOT NULL,post_id INTEGER NOT NULL,text TEXT NOT NULL,created_at TEXT DEFAULT CURRENT_TIMESTAMP,FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE,FOREIGN KEY(post_id) REFERENCES posts(id) ON DELETE CASCADE);
CREATE TABLE IF NOT EXISTS follows(follower_id INTEGER NOT NULL,following_id INTEGER NOT NULL,PRIMARY KEY(follower_id,following_id),FOREIGN KEY(follower_id) REFERENCES users(id) ON DELETE CASCADE,FOREIGN KEY(following_id) REFERENCES users(id) ON DELETE CASCADE);
`);

app.use(express.json({limit:'2mb'}));
app.use(express.urlencoded({extended:true}));
app.use(session({secret:process.env.SESSION_SECRET||'change-this-secret',resave:false,saveUninitialized:false,cookie:{httpOnly:true,sameSite:'lax',maxAge:1000*60*60*24*30}}));
app.use(express.static(path.join(__dirname,'public')));
const upload=multer({dest:path.join(__dirname,'public','uploads'),limits:{fileSize:8*1024*1024},fileFilter:(r,f,cb)=>cb(null,/^image\/(jpeg|png|webp|gif)$/.test(f.mimetype))});
const auth=(req,res,next)=>req.session.userId?next():res.status(401).json({error:'Нужно войти'});
const safeUser=id=>db.prepare('SELECT id,username,name,bio,avatar FROM users WHERE id=?').get(id);

app.post('/api/register',async(req,res)=>{try{const {username,password,name}=req.body;if(!username||!password||!name||username.length<3||password.length<6)return res.status(400).json({error:'Имя пользователя, имя и пароль обязательны. Пароль минимум 6 символов.'});const hash=await bcrypt.hash(password,10);const info=db.prepare('INSERT INTO users(username,password,name) VALUES(?,?,?)').run(username.toLowerCase().replace(/\s/g,''),hash,name.slice(0,40));req.session.userId=info.lastInsertRowid;res.json({user:safeUser(req.session.userId)});}catch(e){res.status(400).json({error:e.code==='SQLITE_CONSTRAINT_UNIQUE'?'Такой username уже занят':'Ошибка регистрации'});}});
app.post('/api/login',async(req,res)=>{const u=db.prepare('SELECT * FROM users WHERE username=?').get(String(req.body.username||'').toLowerCase());if(!u||!(await bcrypt.compare(req.body.password||'',u.password)))return res.status(401).json({error:'Неверный логин или пароль'});req.session.userId=u.id;res.json({user:safeUser(u.id)});});
app.post('/api/logout',(req,res)=>req.session.destroy(()=>res.json({ok:true})));
app.get('/api/me',(req,res)=>res.json({user:req.session.userId?safeUser(req.session.userId):null}));
app.get('/api/feed',(req,res)=>{const me=req.session.userId||0;const posts=db.prepare(`SELECT p.id,p.caption,p.image,p.created_at,u.id user_id,u.username,u.name,u.avatar,(SELECT COUNT(*) FROM likes l WHERE l.post_id=p.id) likes,(SELECT COUNT(*) FROM comments c WHERE c.post_id=p.id) comments,EXISTS(SELECT 1 FROM likes l2 WHERE l2.post_id=p.id AND l2.user_id=?) liked FROM posts p JOIN users u ON u.id=p.user_id ORDER BY p.id DESC LIMIT 50`).all(me);res.json({posts});});
app.post('/api/posts',auth,upload.single('image'),(req,res)=>{if(!req.file)return res.status(400).json({error:'Добавь фото'});const image='/uploads/'+req.file.filename;const info=db.prepare('INSERT INTO posts(user_id,caption,image) VALUES(?,?,?)').run(req.session.userId,String(req.body.caption||'').slice(0,500),image);res.json({id:info.lastInsertRowid});});
app.post('/api/posts/:id/like',auth,(req,res)=>{const id=Number(req.params.id);const exists=db.prepare('SELECT 1 FROM likes WHERE user_id=? AND post_id=?').get(req.session.userId,id);if(exists)db.prepare('DELETE FROM likes WHERE user_id=? AND post_id=?').run(req.session.userId,id);else db.prepare('INSERT OR IGNORE INTO likes(user_id,post_id) VALUES(?,?)').run(req.session.userId,id);res.json({liked:!exists,likes:db.prepare('SELECT COUNT(*) n FROM likes WHERE post_id=?').get(id).n});});
app.get('/api/posts/:id/comments',(req,res)=>res.json({comments:db.prepare(`SELECT c.id,c.text,c.created_at,u.name,u.username,u.avatar FROM comments c JOIN users u ON u.id=c.user_id WHERE c.post_id=? ORDER BY c.id ASC`).all(Number(req.params.id))}));
app.post('/api/posts/:id/comments',auth,(req,res)=>{const text=String(req.body.text||'').trim();if(!text)return res.status(400).json({error:'Комментарий пустой'});db.prepare('INSERT INTO comments(user_id,post_id,text) VALUES(?,?,?)').run(req.session.userId,Number(req.params.id),text.slice(0,300));res.json({ok:true});});
app.post('/api/users/:id/follow',auth,(req,res)=>{const id=Number(req.params.id);if(id===req.session.userId)return res.status(400).json({error:'Нельзя подписаться на себя'});const e=db.prepare('SELECT 1 FROM follows WHERE follower_id=? AND following_id=?').get(req.session.userId,id);if(e)db.prepare('DELETE FROM follows WHERE follower_id=? AND following_id=?').run(req.session.userId,id);else db.prepare('INSERT OR IGNORE INTO follows VALUES(?,?)').run(req.session.userId,id);res.json({following:!e});});
app.get('/api/users/:username',(req,res)=>{const u=db.prepare('SELECT id,username,name,bio,avatar FROM users WHERE username=?').get(req.params.username);if(!u)return res.status(404).json({error:'Пользователь не найден'});u.followers=db.prepare('SELECT COUNT(*) n FROM follows WHERE following_id=?').get(u.id).n;u.following=db.prepare('SELECT COUNT(*) n FROM follows WHERE follower_id=?').get(u.id).n;u.posts=db.prepare('SELECT COUNT(*) n FROM posts WHERE user_id=?').get(u.id).n;u.isFollowing=!!(req.session.userId&&db.prepare('SELECT 1 FROM follows WHERE follower_id=? AND following_id=?').get(req.session.userId,u.id));res.json({user:u});});
app.get('/api/users',auth,(req,res)=>res.json({users:db.prepare('SELECT id,username,name,avatar FROM users WHERE id!=? ORDER BY id DESC LIMIT 30').all(req.session.userId)}));
app.use((req,res,next)=>{if(req.path.startsWith('/api/'))return res.status(404).json({error:'Не найдено'});res.sendFile(path.join(__dirname,'public','index.html'));});
const port=process.env.PORT||3000;app.listen(port,()=>console.log(`Tver Social: http://localhost:${port}`));
