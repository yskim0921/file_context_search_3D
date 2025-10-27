const mysql = require('mysql2/promise');

// MySQL 데이터베이스 설정
const DB_CONFIG = {
    host: 'localhost',
    user: 'admin',
    password: '1qazZAQ!',
    database: 'final',
    charset: 'utf8mb4',
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
};

// Connection Pool 생성
const pool = mysql.createPool(DB_CONFIG);

// 데이터베이스 연결 테스트
async function testConnection() {
    try {
        const connection = await pool.getConnection();
        console.log('✅ MySQL 데이터베이스 연결 성공');
        connection.release();
        return true;
    } catch (error) {
        console.error('❌ MySQL 데이터베이스 연결 실패:', error.message);
        return false;
    }
}

// 데이터베이스 쿼리 실행 함수
async function query(sql, params) {
    try {
        const [results] = await pool.execute(sql, params);
        return results;
    } catch (error) {
        console.error('Query 실행 오류:', error);
        throw error;
    }
}

module.exports = {
    pool,
    testConnection,
    query
};

