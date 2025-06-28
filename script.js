document.getElementById('orderForm').addEventListener('submit', async e => {
  e.preventDefault();

  const name = document.getElementById('name').value.trim();
  const tg = document.getElementById('tg').value.trim();
  const msg = document.getElementById('msg').value.trim();

  const status = document.getElementById('status');
  status.textContent = '⏳ Отправляем заявку...';
  status.style.color = 'black';

  try {
    const res = await fetch('https://nikoad-server.cyclic.app/api/send', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ name, tg, msg }),
    });

    if (res.ok) {
      status.textContent = '✅ Заявка отправлена!';
      status.style.color = 'green';
      document.getElementById('orderForm').reset();
    } else {
      status.textContent = '❌ Ошибка при отправке. Попробуйте позже.';
      status.style.color = 'red';
    }
  } catch (error) {
    status.textContent = '❌ Ошибка сети. Проверьте соединение.';
    status.style.color = 'red';
  }
});
