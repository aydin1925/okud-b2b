const CompanyPartnershipService = require('../../services/CompanyPartnershipService');
const FleetReadinessService = require('../../services/FleetReadinessService');
const PartnershipFleetScopeService = require('../../services/PartnershipFleetScopeService');

const TYPE_LABEL = { provider: 'Hizmet Sağlayıcı', receiver: 'Hizmet Alan' };

async function showList(req, res) {
  const partnerships = await CompanyPartnershipService.listActiveForCompany(
    res.locals.currentCompany.id
  );
  res.render('partnerships/list', {
    title: 'İş Birliklerim',
    partnerships,
    typeLabels: TYPE_LABEL,
  });
}

async function showDetail(req, res) {
  try {
    const currentCompanyId = res.locals.currentCompany.id;
    const detail = await CompanyPartnershipService.getDetail(
      currentCompanyId,
      parseInt(req.params.id, 10)
    );

    // Receiver perspektifi: karşı tarafın (provider'ın) filo uyumu bu ortaklık scope'unda hesaplansın.
    // Provider perspektifinden ise şu an gösterilecek bir şey yok (kendi filosunu
    // filo panelinden görüyor zaten).
    let fleetReadiness = null;
    if (detail.myRole === 'receiver' && detail.isActive) {
      fleetReadiness = await FleetReadinessService.evaluateProviderAgainstReceiver(
        detail.counterparty.id,   // provider
        currentCompanyId,          // receiver
        { partnershipId: detail.id },
      );
    }

    // Provider perspektifi: kendisi seçtiği scope özetini görsün (özet kart + link).
    let scopeCounts = null;
    if (detail.myRole === 'provider' && detail.isActive) {
      scopeCounts = await PartnershipFleetScopeService.getCounts(detail.id);
    }

    res.render('partnerships/detail', {
      title: 'İş Ortaklığı Detayı',
      detail,
      fleetReadiness,
      scopeCounts,
      typeLabels: TYPE_LABEL,
    });
  } catch (err) {
    res.status(403).send(
      `Erişim hatası: ${err.message}. <a href="/company/partnerships">İş Birliklerim</a>`
    );
  }
}

async function terminate(req, res) {
  try {
    // Opsiyonel gerekçe — kırp ve 1000 karakter üstünü kes.
    const rawReason = (req.body && req.body.reason) || '';
    const reason = String(rawReason).trim().slice(0, 1000);

    await CompanyPartnershipService.terminate(
      parseInt(req.params.id, 10),
      res.locals.currentCompany.id,
      req.session.userId,
      reason,
      req.ip
    );
    res.redirect('/company/partnerships');
  } catch (err) {
    res.status(400).send(
      `Fesih hatası: ${err.message}. <a href="/company/partnerships">İş Birliklerim</a>`
    );
  }
}

async function showFleetScope(req, res) {
  try {
    const scope = await PartnershipFleetScopeService.getScope(
      res.locals.currentCompany.id,
      parseInt(req.params.id, 10)
    );
    res.render('partnerships/fleet_scope', {
      title: 'Ortaklık Filo Seçimi',
      scope,
    });
  } catch (err) {
    res.status(403).send(
      `Erişim hatası: ${err.message}. <a href="/company/partnerships/${req.params.id}">Ortaklığa dön</a>`
    );
  }
}

async function updateFleetScope(req, res) {
  const partnershipId = parseInt(req.params.id, 10);
  try {
    // Body'de driver_ids[] ve vehicle_ids[] checkbox olarak gelir (dizi veya tek).
    const toArr = (v) => v == null ? [] : (Array.isArray(v) ? v : [v]);
    await PartnershipFleetScopeService.updateScope(
      res.locals.currentCompany.id,
      partnershipId,
      toArr(req.body.driver_ids),
      toArr(req.body.vehicle_ids),
      req.session.userId
    );
    res.redirect(`/company/partnerships/${partnershipId}/fleet-scope`);
  } catch (err) {
    res.status(400).send(
      `Kaydetme hatası: ${err.message}. <a href="/company/partnerships/${partnershipId}/fleet-scope">Geri</a>`
    );
  }
}

module.exports = { showList, showDetail, terminate, showFleetScope, updateFleetScope };
