<!DOCTYPE html>
<html lang="ru">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0"/>
  <title>NikoAd — Заявка</title>
  <style>
    body {
      font-family: sans-serif;
      max-width: 600px;
      margin: 40px auto;
      padding: 20px;
      background: #f4f4f4;
    }

    form {
      display: flex;
      flex-direction: column;
      gap: 15px;
      background: white;
      padding: 20px;
      border-radius: 10px;
    }

    input, textarea {
      padding: 10px;
      font-size: 16px;
      border: 1px solid #ccc;
      border-radius: 5px;
    }

    button {
      padding: 12px;
      background: #4CAF50;
      color: white;
      border: none;
      font-size: 16px;
      border-radius: 5px;
      cursor: pointer;
    }

    button:hover {
      background: #45a049;
    }

    h1 {
      text-align: center;
    }

    #status {
      text-align: center;
      margin-top: 10px;
      font-weight: bold;
    }
  </style>
</head>
<body>

  <h1>Оставьте заявку</h1>

  <form action="https://formspree.io/f/xnnvlzor" method="POST" id="orderForm">
    <input type="text" name="Имя" placeholder="Ваше имя" required>
    <input type="text" name="Telegram" placeholder="@ваш_ник" required>
    <textarea name="Комментарий" placeholder="Комментарий (необязательно)"></textarea>
    <button type="submit">Отправить</button>
  </form>

</body>
</html>
