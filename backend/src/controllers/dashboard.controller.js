const dashboardService = require('../services/dashboard.service');

const getDashboard = async (req, res) => {
  const data = await dashboardService.getOwnerDashboardData({
    userId: req.user.id,
    emailVerified: Boolean(req.user.email_verified),
  });

  return res.status(200).json(data);
};

module.exports = {
  getDashboard,
};
