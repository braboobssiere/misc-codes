const { exec } = require('child_process');

// If VPN is enabled, connect to VPN
if (process.env.INPUT_VPN_ENABLED === 'true') {
  exec('sudo apt-get update && sudo apt-get install -y openvpn openvpn-systemd-resolved', (err, stdout, stderr) => {
    if (err) {
      console.error('Error installing OpenVPN:', err);
      return;
    }
    console.log(stdout);
    exec('echo "${{ secrets.OPENVPN_CONFIG }}" > vpnconfig.ovpn && sudo openvpn vpnconfig.ovpn', (err, stdout, stderr) => {
      if (err) {
        console.error('Error connecting to VPN:', err);
        return;
      }
      console.log(stdout);
    });
  });
} else {
  // Check if OpenVPN is running, then disconnect
  exec('pgrep openvpn', (err, stdout, stderr) => {
    if (err) {
      console.log('OpenVPN is not running, skipping disconnection.');
      return;  // If OpenVPN is not running, we don't need to disconnect
    }
    exec('sudo pkill openvpn', (err, stdout, stderr) => {
      if (err) {
        console.error('Error disconnecting VPN:', err);
        return;
      }
      console.log(stdout);
    });
  });
}
