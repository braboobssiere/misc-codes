const { exec } = require('child_process');

if (process.env.INPUT_VPN_ENABLED === 'true') {
  // Connect to VPN
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
  // Disconnect VPN
  exec('sudo pkill openvpn', (err, stdout, stderr) => {
    if (err) {
      console.error('Error disconnecting VPN:', err);
      return;
    }
    console.log(stdout);
  });
}
