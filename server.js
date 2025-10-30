// index.js
const app = require('./app');

// 포트 8521 고정
const PORT = 8521;

app.listen(PORT, () => {
  console.log(`서버가 실행중...(클릭) http://localhost:${PORT}`);
});
