var Craider = artifacts.require("CraiderToken");

module.exports = function(deployer, network, accounts) {
  // Main account which have the ownable permissions
  var CraiderAcc = accounts[0];
  deployer.deploy(Craider, {from: CraiderAcc});
}
