#!/usr/bin/env node

/**
 * 生成密码哈希的工具脚本
 * 用于生成与Workers API兼容的密码哈希
 */

const crypto = require('crypto');

// 与Workers中相同的哈希函数
async function hashPassword(password) {
  const encoder = new TextEncoder();
  const data = encoder.encode(password);
  const hashBuffer = await crypto.subtle.digest('SHA-256', data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
}

// 生成admin123的哈希
async function generateAdminHash() {
  try {
    const password = 'admin123';
    const hash = await hashPassword(password);
    console.log('密码:', password);
    console.log('哈希:', hash);
    
    // 生成SQL更新语句
    console.log('\nSQL更新语句:');
    console.log(`UPDATE users SET password_hash = '${hash}' WHERE username = 'admin';`);
    
    return hash;
  } catch (error) {
    console.error('生成哈希失败:', error);
  }
}

if (require.main === module) {
  generateAdminHash();
}

module.exports = { hashPassword, generateAdminHash };
