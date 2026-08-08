const crypto = require('crypto');
const { OTP_CODE_LENGTH, OTP_ALPHABET } = require('./constants');

// Kriptografik olarak güvenli rastgele OTP kodu üretir.
// crypto.randomInt bias'sız (modulo bias yok) tamsayı verir.
function generateCode() {
  let code = '';
  for (let i = 0; i < OTP_CODE_LENGTH; i++) {
    const idx = crypto.randomInt(0, OTP_ALPHABET.length);
    code += OTP_ALPHABET[idx];
  }
  return code;
}

module.exports = { generateCode };
