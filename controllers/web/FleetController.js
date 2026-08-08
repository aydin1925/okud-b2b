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

module.exports = { showDrivers, showVehicles, showDriverDetail, showVehicleDetail };
