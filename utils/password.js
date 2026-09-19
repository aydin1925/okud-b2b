// Ortak şifre politikası. Tek yerde tanımlı ki register + reset aynı kuralı uygulasın.
// Kural (mütevazı ama makul): en az 8 karakter, en az bir harf ve en az bir rakam.
const MIN_LENGTH = 8;

function validatePassword(pw) {
  const s = String(pw || '');
  if (s.length < MIN_LENGTH) {
    return `Şifre en az ${MIN_LENGTH} karakter olmalı.`;
  }
  if (!/[A-Za-zÇĞİÖŞÜçğıöşü]/.test(s)) {
    return 'Şifre en az bir harf içermeli.';
  }
  if (!/[0-9]/.test(s)) {
    return 'Şifre en az bir rakam içermeli.';
  }
  return null; // geçerli
}

// Geçersizse hata fırlatır (çağıran try/catch ile yakalar).
function assertStrongPassword(pw) {
  const err = validatePassword(pw);
  if (err) throw new Error(err);
}

module.exports = { validatePassword, assertStrongPassword, MIN_LENGTH };
