document.getElementById('orderForm').addEventListener('submit', async e => {
  e.preventDefault();

  const name = document.getElementById('name').value.trim();
  const tg = document.getElementById('tg').value.trim();
  const msg = document.getElementById('msg').value.trim();
  const status = document.getElementById('status');

  status.textContent = '⏳ Отправка...';
  status.style.color = 'black';

  try {
    const res = await fetch('https://formspree.io/f/xnnvlzor', {
      method: 'POST',
      headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: new URLSearchParams({
        'Имя': name,
        'Telegram': tg,
        'Комментарий': msg
      })
    });

    if (res.ok) {
      status.textContent = '✅ Заявка отправлена!';
      status.style.color = 'green';
      document.getElementById('orderForm').reset();
    } else {
      status.textContent = '❌ Ошибка. Попробуйте позже.';
      status.style.color = 'red';
    }
  } catch (error) {
    status.textContent = '❌ Ошибка сети. Проверьте соединение.';
    status.style.color = 'red';
    console.error(error);
  }
});
