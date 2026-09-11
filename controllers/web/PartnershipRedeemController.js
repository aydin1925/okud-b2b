const PartnershipRedeemService = require('../../services/PartnershipRedeemService');

function showForm(req, res) {
  res.render('partnerships/redeem', {
    title: 'İş Ortaklığı Davetine Katıl',
    error: null,
    code: '',
  });
}

async function preview(req, res) {
  try {
    const preview = await PartnershipRedeemService.getRedeemPreview(
      req.body.code,
      res.locals.currentCompany.id
    );
    res.render('partnerships/redeem_preview', {
      title: 'İş Ortaklığını Onayla',
      preview,
    });
  } catch (err) {
    res.status(400).render('partnerships/redeem', {
      title: 'İş Ortaklığı Davetine Katıl',
      error: err.message,
      code: req.body.code || '',
    });
  }
}

async function confirm(req, res) {
  try {
    const result = await PartnershipRedeemService.redeem({
      code: req.body.code,
      currentCompanyId: res.locals.currentCompany.id,
      acceptingUserId: req.session.userId,
      contractConsent: req.body.contract_consent === 'on',
      ipAddress: req.ip,
    });
    res.render('partnerships/redeem_success', {
      title: 'İş Ortaklığı Kuruldu',
      result,
    });
  } catch (err) {
    res.status(400).send(
      `Katılım hatası: ${err.message}. <a href="/partnerships/redeem">Tekrar dene</a>`
    );
  }
}

async function reject(req, res) {
  try {
    await PartnershipRedeemService.rejectByAdmin({
      code: req.body.code,
      userId: req.session.userId,
    });
    res.render('partnerships/redeem_rejected', { title: 'Davet Reddedildi' });
  } catch (err) {
    res.status(400).send(
      `Reddetme hatası: ${err.message}. <a href="/partnerships/redeem">Tekrar dene</a>`
    );
  }
}

/**
 * "Reddet + karşı tarafa eksikleri bildir" — sadece receiver kullanır.
 * Bildirim provider'ın manager'larına gider, içerik sistem tarafı hazırlar.
 */
async function rejectWithNotice(req, res) {
  try {
    await PartnershipRedeemService.rejectWithReadinessNotice({
      code: req.body.code,
      currentCompanyId: res.locals.currentCompany.id,
      userId: req.session.userId,
    });
    res.render('partnerships/redeem_rejected', {
      title: 'Davet Reddedildi ve Karşı Taraf Bilgilendirildi',
    });
  } catch (err) {
    res.status(400).send(
      `Reddetme hatası: ${err.message}. <a href="/partnerships/redeem">Tekrar dene</a>`
    );
  }
}

module.exports = { showForm, preview, confirm, reject, rejectWithNotice };
