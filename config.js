// Configuration file for jar-verify.

module.exports = {

  // Definition of all available ASIC types
  asicTypes: [
    {name: 'BE3', type: 'CNA'},
    {name: 'Lancer', type: 'FC'},
    {name: 'Saturn', type: 'FC'},
    {name: 'Skyhawk', type: 'CNA'},
  ],

  // Definition of all Operating System mappings
  // Note: Name in BOM file must begin as shown in 'name' field below.
  osMappings: [
    {name: 'RHEL 5',          id: 203, pkgsdkName: ['RHEL 5'], arch: ['x86', 'x64']},
    {name: 'RHEL 6',          id: 208, pkgsdkName: ['RHEL 6'], arch: ['x86', 'x64']},
    {name: 'RHEL 7',          id: 209, pkgsdkName: ['RHEL 7'], arch: ['x64']},
    {name: 'SLES 10',         id: 206, pkgsdkName: ['SLES 10'], arch: ['x86', 'x64']},
    {name: 'SLES 11',         id: 207, pkgsdkName: ['SLES 11'], arch: ['x86', 'x64']},
    {name: 'SLES 12',         id: 210, pkgsdkName: ['SLES 12'], arch: ['x64']},
    {name: 'Windows 2008',    id: 109, pkgsdkName: ['Windows 2008'], arch: ['x86', 'x64']},
    {name: 'Windows 2012',    id: 112, pkgsdkName: ['Windows 2012'], arch: ['x64']},
    {name: 'Windows 2012 R2', id: 113, pkgsdkName: ['Windows 2012 R2'], arch: ['x64']},
    {name: 'VMware ESXi 5.0', id: 311, pkgsdkName: ['VMware vSphere 5.0'], arch: ['x64']},
    {name: 'VMware ESXi 5.1', id: 311, pkgsdkName: ['VMware vSphere 5.0'], arch: ['x64']},
    {name: 'VMware ESXi 5.5', id: 312, pkgsdkName: ['VMware vSphere 2013', 'VMware ESXi 5.5'], arch: ['x64']},
    {name: 'VMware ESXi 6.0', id: 313, pkgsdkName: ['VMware ESXi 6'], arch: ['x64']},
  ],

  // List of valid Applicable Device ID names
  appDIDNames: [
    // Saturn
    'elx_Tetra_FC',
    'elx_Rhea_FC',
    'elx_Heritage_1p_2p_FC',

    //BE2 NIC
    'elx_Mirage1_N',
    'elx_Endeavor1_N',
    'elx_Eraptor1_N',
    'elx_Eraptor1Adv_N',

    //BE2 iSCSI
    'elx_Mirage1_I',
    'elx_Endeavor1_I',
    'elx_Eraptor1_I',
    'elx_Eraptor1Adv_I',

    //BE2 FCoE
    'elx_Mirage1_F',
    'elx_Endeavor1_F',
    'elx_Eraptor1_F',
    'elx_Eraptor1Adv_F',

    //BE3 NIC
    'elx_Turnberry',
    'elx_Endeavor2_N',
    'elx_Mirage2_N',
    'elx_Endeavor3_N',
    'elx_Eraptor2_N',
    'elx_Wildcatx_N',
    'elx_Robalo_N',
    'elx_Eraptor2Adv_N',
    'elx_Endeavor2Adv_N',
    'elx_Blacktip_N',
    'elx_Blacktip_Red_N',
    'elx_Congo_N',
    'elx_USI_ES_N',
    'elx_RobaloAdv_N',
    'elx_Reno_N',
    'elx_Tigershark_N',
    'elx_Penguin_N',
    'elx_Eagle_N',

    //BE3 iSCSI
    'elx_Endeavor2_I',
    'elx_Mirage2_I',
    'elx_Endeavor3_I',
    'elx_Eraptor2_I',
    'elx_Wildcatx_I',
    'elx_Robalo_I',
    'elx_Eraptor2Adv_I',
    'elx_Endeavor2Adv_I',
    'elx_Blacktip_I',
    'elx_Blacktip_Red_I',
    'elx_Congo_I',
    'elx_USI_ES_I',
    'elx_RobaloAdv_I',
    'elx_Reno_I',
    'elx_Tigershark_I',
    'elx_Penguin_I',
    'elx_Eagle_I',

    //BE3 FCoE
    'elx_Endeavor2_F',
    'elx_Mirage2_F',
    'elx_Endeavor3_F',
    'elx_Eraptor2_F',
    'elx_Wildcatx_F',
    'elx_Robalo_F',
    'elx_Eraptor2Adv_F',
    'elx_Endeavor2Adv_F',
    'elx_Blacktip_F',
    'elx_Blacktip_Red_F',
    'elx_Congo_F',
    'elx_USI_ES_F',
    'elx_RobaloAdv_F',
    'elx_Reno_F',
    'elx_Tigershark_F',
    'elx_Penguin_F',
    'elx_Eagle_F',

    //Lancer FC
    'elx_Vanguard_FC',
    'elx_VanguardDL_FC',
    'elx_Chameleon1P_FC',
    'elx_Chameleon2P_FC',

    //Skyhawk NIC
    'elx_Silver_N',
    'elx_Silver_P2_N',
    'elx_Skyeagle_N',
    'elx_Skyeagle_P2_N',
    'elx_Newport_N',
    'elx_Braddock_N',
    'elx_Skybird_N',
    'elx_Skybird_P2_N',
    'elx_Skybird_P2_4p_N',
    'elx_Gold_N',
    'elx_Gold_Lite_N',
    'elx_Gold_Plus_N',
    'elx_Gold_Plus_P2_N',
    'elx_Gold_P2_N',

    //Skyhawk iSCSI
    'elx_Silver_I',
    'elx_Silver_P2_I',
    'elx_Skyeagle_I',
    'elx_Skyeagle_P2_I',
    'elx_Newport_I',
    'elx_Braddock_I',
    'elx_Skybird_I',
    'elx_Skybird_P2_I',
    'elx_Skybird_P2_4p_I',
    'elx_Gold_I',
    'elx_Gold_Lite_I',
    'elx_Gold_Plus_I',
    'elx_Gold_Plus_P2_I',
    'elx_Gold_P2_I',

    //Skyhawk FCoE
    'elx_Silver_F',
    'elx_Silver_P2_F',
    'elx_Skyeagle_F',
    'elx_Skyeagle_P2_F',
    'elx_Newport_F',
    'elx_Braddock_F',
    'elx_Skybird_F',
    'elx_Skybird_P2_F',
    'elx_Skybird_P2_4p_F',
    'elx_Gold_F',
    'elx_Gold_Lite_F',
    'elx_Gold_Plus_F',
    'elx_Gold_Plus_P2_F',
    'elx_Gold_P2_F',
  ],

  // All header search strings used to find relevant sections
  relNameString: 'release: ',
  relTypeString: 'type: ',
  osString: 'operating systems',
  systemString: 'machine types',
  adapterString: 'adapter models',
  ddWinNICString: 'win nic dd',
  ddWinISCSIString: 'win iscsi dd',
  ddWinFCString: 'win fc dd',
  ddWinFCoEString: 'win fcoe dd',
  ddLinNICString: 'linux nic dd',
  ddLinISCSIString: 'linux iscsi dd',
  ddLinFCString: 'linux fc/fcoe dd',
  fwSaturnString: 'saturn fw',
  fwLancerString: 'lancer fw',
  fwBEString: 'be fw',
  fwSkyhawkString: 'skyhawk fw',

  // System type headers (ignored but need to be tracked)
  mtmHeaders: ['rack', 'flex'],

};