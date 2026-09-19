const FleetOverviewService = require('../../services/FleetOverviewService');

async function showDrivers(req, res) {
  const { members, stats } = await FleetOverviewService.listDrivers(res.locals.currentCompany.id);
  res.render('fleet/list', {
    title: 'Filo — Şoförler',
    activeTab: 'drivers',
    members,
    stats,
  });
}

async function showVehicles(req, res) {
  const { members, stats } = await FleetOverviewService.listVehicles(res.locals.currentCompany.id);
  res.render('fleet/list', {
    title: 'Filo — Araçlar',
    activeTab: 'vehicles',
    members,
    stats,
  });
}

async function showDriverDetail(req, res) {
  try {
    const memberId = parseInt(req.params.id, 10);
    const detail = await FleetOverviewService.getMemberDetail(
      res.locals.currentCompany.id, 'driver', memberId
    );
    res.render('fleet/detail', {
      title: `Şoför Detayı`,
      detail,
    });
  } catch (err) {
    res.status(403).send(`Erişim hatası: ${err.message}. <a href="/company/fleet/drivers">Filoya dön</a>`);
  }
}

async function showVehicleDetail(req, res) {
  try {
    const memberId = parseInt(req.params.id, 10);
    const detail = await FleetOverviewService.getMemberDetail(
      res.locals.currentCompany.id, 'vehicle', memberId
    );
    res.render('fleet/detail', {
      title: `Araç Detayı`,
      detail,
    });
  } catch (err) {
    res.status(403).send(`Erişim hatası: ${err.message}. <a href="/company/fleet/vehicles">Filoya dön</a>`);
  }
}

// Bir filo üyesini geçici pasife alma / aktifleştirme.
// Route yapısı: /company/fleet/:type/:id/pause veya /resume
// (path-to-regexp v6 inline enum regex desteklemediği için pause/resume ayrı endpoints,
//  type de :type olarak alınır — driver | vehicle bekliyoruz.)
async function pauseMember(req, res) {
  const type = req.params.type === 'drivers' ? 'driver' : 'vehicle';
  const memberId = parseInt(req.params.id, 10);
  try {
    await FleetOverviewService.setPaused(
      res.locals.currentCompany.id, type, memberId, true, req.session.userId, req.ip
    );
    res.redirect(`/company/fleet/${req.params.type}/${memberId}`);
  } catch (err) {
    res.status(400).send(`Hata: ${err.message}. <a href="/company/fleet/${req.params.type}">Filoya dön</a>`);
  }
}

async function resumeMember(req, res) {
  const type = req.params.type === 'drivers' ? 'driver' : 'vehicle';
  const memberId = parseInt(req.params.id, 10);
  try {
    await FleetOverviewService.setPaused(
      res.locals.currentCompany.id, type, memberId, false, req.session.userId, req.ip
    );
    res.redirect(`/company/fleet/${req.params.type}/${memberId}`);
  } catch (err) {
    res.status(400).send(`Hata: ${err.message}. <a href="/company/fleet/${req.params.type}">Filoya dön</a>`);
  }
}

module.exports = { showDrivers, showVehicles, showDriverDetail, showVehicleDetail, pauseMember, resumeMember };
