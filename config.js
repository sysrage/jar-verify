// Configuration file for jar-verify.

module.exports = {

  // Temporary directory for file extraction/comparison
  tempDir: '/tmp/',

  // Base directory where data files should be saved
  dataDir: __dirname + '/data/',

  // Base directory where JAR files should be located
  jarDir: '/Users/sysrage/Downloads/jars/',

  // Regular Expression to match vendor string (matches elx or elx-lnvgy)
  vendor: 'elx(?:\-lnvgy)?',

  // Definition of all available ASIC types
  asicTypes: [
    {name: 'BE3', type: 'cna'},
    {name: 'Lancer', type: 'fc'},
    {name: 'Saturn', type: 'fc'},
    {name: 'Skyhawk', type: 'cna'},
  ],

  // Definition of all Operating System mappings
  // Name in BOM file must begin as shown in 'name' field below.
  // If two entries contain the same 'name' data (e.g. Windows 2012 and Windows 2012 R2), the more precise
  // entry (i.e. Windows 2012 R2) must be listed first.
  osMappings: [
    {
      name: 'RHEL 5',
      id: 203,
      pkgsdkName: ['RHEL 5'],
      version: '5',
      arch: ['x86', 'x64'],
      type: 'linux',
      ddName: 'rhel5'
    },
    {
      name: 'RHEL 6',
      id: 208,
      pkgsdkName: ['RHEL 6'],
      version: '6',
      arch: ['x86', 'x64'],
      type: 'linux',
      ddName: 'rhel6'
    },
    {
      name: 'RHEL 7',
      id: 209,
      pkgsdkName: ['RHEL 7'],
      version: '7',
      arch: ['x64'],
      type: 'linux',
      ddName: 'rhel7'
    },
    {
      name: 'SLES 10',
      id: 206,
      pkgsdkName: ['SLES 10'],
      version: '10',
      arch: ['x86', 'x64'],
      type: 'linux',
      ddName: 'sles10'
    },
    {
      name: 'SLES 11',
      id: 207,
      pkgsdkName: ['SLES 11'],
      version: '11',
      arch: ['x86', 'x64'],
      type: 'linux',
      ddName: 'sles11'
    },
    {
      name: 'SLES 12',
      id: 210,
      pkgsdkName: ['SLES 12'],
      version: '12',
      arch: ['x64'],
      type: 'linux',
      ddName: 'sles12'
    },
    {
      name: 'Windows 2008',
      id: 109,
      pkgsdkName: ['Windows 2008'],
      version: '2008',
      arch: ['x86', 'x64'],
      type: 'windows',
      ddName: 'windows'
    },
    {
      name: 'Windows 2012 R2',
      id: 113,
      pkgsdkName: ['Windows 2012 R2'],
      version: '2012 R2',
      arch: ['x64'],
      type: 'windows',
      ddName: 'windows'
    },
    {
      name: 'Windows 2012',
      id: 112,
      pkgsdkName: ['Windows 2012'],
      version: '2012',
      arch: ['x64'],
      type: 'windows',
      ddName: 'windows'
    },
    {
      name: 'VMware ESXi 5.0',
      id: 311,
      pkgsdkName: ['VMware vSphere 5.0'],
      version: '5.0',
      arch: ['x64'],
      type: 'vmware',
      ddName: 'none'
    },
    {
      name: 'VMware ESXi 5.1',
      id: 311,
      pkgsdkName: ['VMware vSphere 5.0'],
      version: '5.0',
      arch: ['x64'],
      type: 'vmware',
      ddName: 'none'
    },
    {
      name: 'VMware ESXi 5.5',
      id: 312,
      pkgsdkName: ['VMware vSphere 2013', 'VMware ESXi 5.5'],
      version: '5.5',
      arch: ['x64'],
      type: 'vmware',
      ddName: 'none'
    },
    {
      name: 'VMware ESXi 6.0',
      id: 313,
      pkgsdkName: ['VMware ESXi 6'],
      version: '6.0',
      arch: ['x64'],
      type: 'vmware',
      ddName: 'none'
    },
  ],

  // List of valid Applicable Device ID names
  appDIDNames: [
    // 4Gb FC
    {name: 'elx_Zeppelin_1p_2p_FC', value: 'PCI\VEN_10DF&DEV_FE00&SUBSYS_FE0010DF'},

    // Saturn
    {name: 'elx_Tetra_FC',          value: 'PCI\VEN_10DF&DEV_F100&SUBSYS_F12410DF'},
    {name: 'elx_Rhea_FC',           value: 'PCI\VEN_10DF&DEV_F100&SUBSYS_F13010DF'},
    {name: 'elx_Heritage_1p_2p_FC', value: 'PCI\VEN_10DF&DEV_F100&SUBSYS_F10010DF'},

    // BE2 NIC
    {name: 'elx_Mirage1_N',         value: 'PCI\VEN_19A2&DEV_0700&SUBSYS_E62810DF'},
    {name: 'elx_Endeavor1_N',       value: 'PCI\VEN_19A2&DEV_0700&SUBSYS_E62910DF'},
    {name: 'elx_Eraptor1_N',        value: 'PCI\VEN_19A2&DEV_0700&SUBSYS_E63010DF'},
    {name: 'elx_Eraptor1Adv_N',     value: 'PCI\VEN_19A2&DEV_0700&SUBSYS_E65010DF'},

    // BE2 iSCSI
    {name: 'elx_Mirage1_I',         value: 'PCI\VEN_19A2&DEV_0702&SUBSYS_E62810DF'},
    {name: 'elx_Endeavor1_I',       value: 'PCI\VEN_19A2&DEV_0702&SUBSYS_E62910DF'},
    {name: 'elx_Eraptor1_I',        value: 'PCI\VEN_19A2&DEV_0702&SUBSYS_E63010DF'},
    {name: 'elx_Eraptor1Adv_I',     value: 'PCI\VEN_19A2&DEV_0702&SUBSYS_E65010DF'},

    // BE2 FCoE
    {name: 'elx_Mirage1_F',         value: 'PCI\VEN_19A2&DEV_0704&SUBSYS_E62810DF'},
    {name: 'elx_Endeavor1_F',       value: 'PCI\VEN_19A2&DEV_0704&SUBSYS_E62910DF'},
    {name: 'elx_Eraptor1_F',        value: 'PCI\VEN_19A2&DEV_0704&SUBSYS_E63010DF'},
    {name: 'elx_Eraptor1Adv_F',     value: 'PCI\VEN_19A2&DEV_0704&SUBSYS_E65010DF'},

    // BE3 NIC
    {name: 'elx_Turnberry',         value: 'PCI\VEN_19A2&DEV_0710&SUBSYS_E70E10DF'},
    {name: 'elx_Endeavor2_N',       value: 'PCI\VEN_19A2&DEV_0710&SUBSYS_E72810DF'},
    {name: 'elx_Mirage2_N',         value: 'PCI\VEN_19A2&DEV_0710&SUBSYS_E72910DF'},
    {name: 'elx_Endeavor3_N',       value: 'PCI\VEN_19A2&DEV_0710&SUBSYS_E72A10DF'},
    {name: 'elx_Eraptor2_N',        value: 'PCI\VEN_19A2&DEV_0710&SUBSYS_E73010DF'},
    {name: 'elx_Wildcatx_N',        value: 'PCI\VEN_19A2&DEV_0710&SUBSYS_E73110DF'},
    {name: 'elx_Robalo_N',          value: 'PCI\VEN_19A2&DEV_0710&SUBSYS_E73510DF'},
    {name: 'elx_Eraptor2Adv_N',     value: 'PCI\VEN_19A2&DEV_0710&SUBSYS_E75010DF'},
    {name: 'elx_Endeavor2Adv_N',    value: 'PCI\VEN_19A2&DEV_0710&SUBSYS_E70810DF'},
    {name: 'elx_Blacktip_N',        value: 'PCI\VEN_19A2&DEV_0710&SUBSYS_E70B10DF'},
    {name: 'elx_Blacktip_Red_N',    value: 'PCI\VEN_19A2&DEV_0710&SUBSYS_E75810DF'},
    {name: 'elx_Congo_N',           value: 'PCI\VEN_19A2&DEV_0710&SUBSYS_E70F10DF'},
    {name: 'elx_USI_ES_N',          value: 'PCI\VEN_19A2&DEV_0710&SUBSYS_E71B10DF'},
    {name: 'elx_RobaloAdv_N',       value: 'PCI\VEN_19A2&DEV_0710&SUBSYS_E71510DF'},
    {name: 'elx_Reno_N',            value: 'PCI\VEN_19A2&DEV_0710&SUBSYS_E70C10DF'},
    {name: 'elx_Tigershark_N',      value: 'PCI\VEN_19A2&DEV_0710&SUBSYS_E70A10DF'},
    {name: 'elx_Penguin_N',         value: 'PCI\VEN_19A2&DEV_0710&SUBSYS_E71710DF'},
    {name: 'elx_Eagle_N',           value: 'PCI\VEN_19A2&DEV_0710&SUBSYS_E71910DF'},

    // BE3 iSCSI
    {name: 'elx_Endeavor2_I',       value: 'PCI\VEN_19A2&DEV_0712&SUBSYS_E72810DF'},
    {name: 'elx_Mirage2_I',         value: 'PCI\VEN_19A2&DEV_0712&SUBSYS_E72910DF'},
    {name: 'elx_Endeavor3_I',       value: 'PCI\VEN_19A2&DEV_0712&SUBSYS_E72A10DF'},
    {name: 'elx_Eraptor2_I',        value: 'PCI\VEN_19A2&DEV_0712&SUBSYS_E73010DF'},
    {name: 'elx_Wildcatx_I',        value: 'PCI\VEN_19A2&DEV_0712&SUBSYS_E73110DF'},
    {name: 'elx_Robalo_I',          value: 'PCI\VEN_19A2&DEV_0712&SUBSYS_E73510DF'},
    {name: 'elx_Eraptor2Adv_I',     value: 'PCI\VEN_19A2&DEV_0712&SUBSYS_E75010DF'},
    {name: 'elx_Endeavor2Adv_I',    value: 'PCI\VEN_19A2&DEV_0712&SUBSYS_E70810DF'},
    {name: 'elx_Blacktip_I',        value: 'PCI\VEN_19A2&DEV_0712&SUBSYS_E70B10DF'},
    {name: 'elx_Blacktip_Red_I',    value: 'PCI\VEN_19A2&DEV_0712&SUBSYS_E75810DF'},
    {name: 'elx_Congo_I',           value: 'PCI\VEN_19A2&DEV_0712&SUBSYS_E70F10DF'},
    {name: 'elx_USI_ES_I',          value: 'PCI\VEN_19A2&DEV_0712&SUBSYS_E71B10DF'},
    {name: 'elx_RobaloAdv_I',       value: 'PCI\VEN_19A2&DEV_0712&SUBSYS_E71510DF'},
    {name: 'elx_Reno_I',            value: 'PCI\VEN_19A2&DEV_0712&SUBSYS_E70C10DF'},
    {name: 'elx_Tigershark_I',      value: 'PCI\VEN_19A2&DEV_0712&SUBSYS_E70A10DF'},
    {name: 'elx_Penguin_I',         value: 'PCI\VEN_19A2&DEV_0712&SUBSYS_E71710DF'},
    {name: 'elx_Eagle_I',           value: 'PCI\VEN_19A2&DEV_0712&SUBSYS_E71910DF'},

    // BE3 FCoE
    {name: 'elx_Endeavor2_F',       value: 'PCI\VEN_19A2&DEV_0714&SUBSYS_E72810DF'},
    {name: 'elx_Mirage2_F',         value: 'PCI\VEN_19A2&DEV_0714&SUBSYS_E72910DF'},
    {name: 'elx_Endeavor3_F',       value: 'PCI\VEN_19A2&DEV_0714&SUBSYS_E72A10DF'},
    {name: 'elx_Eraptor2_F',        value: 'PCI\VEN_19A2&DEV_0714&SUBSYS_E73010DF'},
    {name: 'elx_Wildcatx_F',        value: 'PCI\VEN_19A2&DEV_0714&SUBSYS_E73110DF'},
    {name: 'elx_Robalo_F',          value: 'PCI\VEN_19A2&DEV_0714&SUBSYS_E73510DF'},
    {name: 'elx_Eraptor2Adv_F',     value: 'PCI\VEN_19A2&DEV_0714&SUBSYS_E75010DF'},
    {name: 'elx_Endeavor2Adv_F',    value: 'PCI\VEN_19A2&DEV_0714&SUBSYS_E70810DF'},
    {name: 'elx_Blacktip_F',        value: 'PCI\VEN_19A2&DEV_0714&SUBSYS_E70B10DF'},
    {name: 'elx_Blacktip_Red_F',    value: 'PCI\VEN_19A2&DEV_0714&SUBSYS_E75810DF'},
    {name: 'elx_Congo_F',           value: 'PCI\VEN_19A2&DEV_0714&SUBSYS_E70F10DF'},
    {name: 'elx_USI_ES_F',          value: 'PCI\VEN_19A2&DEV_0714&SUBSYS_E71B10DF'},
    {name: 'elx_RobaloAdv_F',       value: 'PCI\VEN_19A2&DEV_0714&SUBSYS_E71510DF'},
    {name: 'elx_Reno_F',            value: 'PCI\VEN_19A2&DEV_0714&SUBSYS_E70C10DF'},
    {name: 'elx_Tigershark_F',      value: 'PCI\VEN_19A2&DEV_0714&SUBSYS_E70A10DF'},
    {name: 'elx_Penguin_F',         value: 'PCI\VEN_19A2&DEV_0714&SUBSYS_E71710DF'},
    {name: 'elx_Eagle_F',           value: 'PCI\VEN_19A2&DEV_0714&SUBSYS_E71910DF'},

    // Lancer
    {name: 'elx_Vanguard_FC',       value: 'PCI\VEN_10DF&DEV_E200&SUBSYS_E20210DF'},
    {name: 'elx_VanguardDL_FC',     value: 'PCI\VEN_10DF&DEV_E200&SUBSYS_E28210DF'},
    {name: 'elx_Chameleon1P_FC',    value: 'PCI\VEN_10DF&DEV_E200&SUBSYS_E20310DF'},
    {name: 'elx_Chameleon2P_FC',    value: 'PCI\VEN_10DF&DEV_E200&SUBSYS_E20410DF'},

    // Skyhawk NIC
    {name: 'elx_Silver_N',          value: 'PCI\VEN_10DF&DEV_0720&SUBSYS_E81010DF'},
    {name: 'elx_Silver_P2_N',       value: 'PCI\VEN_10DF&DEV_0720&SUBSYS_E81F10DF'},
    {name: 'elx_Skyeagle_N',        value: 'PCI\VEN_10DF&DEV_0720&SUBSYS_E81110DF'},
    {name: 'elx_Newport_N',         value: 'PCI\VEN_10DF&DEV_0720&SUBSYS_E81210DF'},
    {name: 'elx_Braddock_N',        value: 'PCI\VEN_10DF&DEV_0720&SUBSYS_E81310DF'},
    {name: 'elx_Skybird_N',         value: 'PCI\VEN_10DF&DEV_0720&SUBSYS_E81510DF'},
    {name: 'elx_Skybird_P2_N',      value: 'PCI\VEN_10DF&DEV_0720&SUBSYS_E81B10DF'},
    {name: 'elx_Skybird_P2_4p_N',   value: 'PCI\VEN_10DF&DEV_0720&SUBSYS_E81A10DF'},
    {name: 'elx_Gold_N',            value: 'PCI\VEN_10DF&DEV_0720&SUBSYS_E81610DF'},
    {name: 'elx_Gold_Lite_N',       value: 'PCI\VEN_10DF&DEV_0720&SUBSYS_E81710DF'},
    {name: 'elx_Gold_Plus_N',       value: 'PCI\VEN_10DF&DEV_0720&SUBSYS_E81810DF'},
    {name: 'elx_Gold_Plus_P2_N',    value: 'PCI\VEN_10DF&DEV_0720&SUBSYS_E81E10DF'},
    {name: 'elx_Gold_P2_N',         value: 'PCI\VEN_10DF&DEV_0720&SUBSYS_E81C10DF'},

    // Skyhawk iSCSI
    {name: 'elx_Silver_I',          value: 'PCI\VEN_10DF&DEV_0722&SUBSYS_E81010DF'},
    {name: 'elx_Silver_P2_I',       value: 'PCI\VEN_10DF&DEV_0722&SUBSYS_E81F10DF'},
    {name: 'elx_Skyeagle_I',        value: 'PCI\VEN_10DF&DEV_0722&SUBSYS_E81110DF'},
    {name: 'elx_Newport_I',         value: 'PCI\VEN_10DF&DEV_0722&SUBSYS_E81210DF'},
    {name: 'elx_Braddock_I',        value: 'PCI\VEN_10DF&DEV_0722&SUBSYS_E81310DF'},
    {name: 'elx_Skybird_I',         value: 'PCI\VEN_10DF&DEV_0722&SUBSYS_E81510DF'},
    {name: 'elx_Skybird_P2_I',      value: 'PCI\VEN_10DF&DEV_0722&SUBSYS_E81B10DF'},
    {name: 'elx_Skybird_P2_4p_I',   value: 'PCI\VEN_10DF&DEV_0722&SUBSYS_E81A10DF'},
    {name: 'elx_Gold_I',            value: 'PCI\VEN_10DF&DEV_0722&SUBSYS_E81610DF'},
    {name: 'elx_Gold_Lite_I',       value: 'PCI\VEN_10DF&DEV_0722&SUBSYS_E81710DF'},
    {name: 'elx_Gold_Plus_I',       value: 'PCI\VEN_10DF&DEV_0722&SUBSYS_E81810DF'},
    {name: 'elx_Gold_Plus_P2_I',    value: 'PCI\VEN_10DF&DEV_0722&SUBSYS_E81E10DF'},
    {name: 'elx_Gold_P2_I',         value: 'PCI\VEN_10DF&DEV_0722&SUBSYS_E81C10DF'},

    // Skyhawk FCoE
    {name: 'elx_Silver_F',          value: 'PCI\VEN_10DF&DEV_0724&SUBSYS_E81010DF'},
    {name: 'elx_Silver_P2_F',       value: 'PCI\VEN_10DF&DEV_0724&SUBSYS_E81F10DF'},
    {name: 'elx_Skyeagle_F',        value: 'PCI\VEN_10DF&DEV_0724&SUBSYS_E81110DF'},
    {name: 'elx_Newport_F',         value: 'PCI\VEN_10DF&DEV_0724&SUBSYS_E81210DF'},
    {name: 'elx_Braddock_F',        value: 'PCI\VEN_10DF&DEV_0724&SUBSYS_E81310DF'},
    {name: 'elx_Skybird_F',         value: 'PCI\VEN_10DF&DEV_0724&SUBSYS_E81510DF'},
    {name: 'elx_Skybird_P2_F',      value: 'PCI\VEN_10DF&DEV_0724&SUBSYS_E81B10DF'},
    {name: 'elx_Skybird_P2_4p_F',   value: 'PCI\VEN_10DF&DEV_0724&SUBSYS_E81A10DF'},
    {name: 'elx_Gold_F',            value: 'PCI\VEN_10DF&DEV_0724&SUBSYS_E81610DF'},
    {name: 'elx_Gold_Lite_F',       value: 'PCI\VEN_10DF&DEV_0724&SUBSYS_E81710DF'},
    {name: 'elx_Gold_Plus_F',       value: 'PCI\VEN_10DF&DEV_0724&SUBSYS_E81810DF'},
    {name: 'elx_Gold_Plus_P2_F',    value: 'PCI\VEN_10DF&DEV_0724&SUBSYS_E81E10DF'},
    {name: 'elx_Gold_P2_F',         value: 'PCI\VEN_10DF&DEV_0724&SUBSYS_E81C10DF'},
  ],

  // Package types and their expected FixIDs
  pkgTypes: {
    ddWinNIC: {
      name: 'Windows NIC Driver',
      regex: '^elx(?:\-lnvgy)?\_dd_nic_([^_]+)_windows',
      type: 'dd',
      os: 'windows',
      proto: 'nic',
      inputDesc: 'Emulex NIC Device Driver for Windows - ##VERSION## - Release ##RELEASE##',
      ddFileName: ['ocnd63.sys', 'ocnd64.sys']
    },
    ddWinISCSI: {
      name: 'Windows iSCSI Driver',
      regex: '^elx(?:\-lnvgy)?\_dd_iscsi_([^_]+)_windows',
      type: 'dd',
      os: 'windows',
      proto: 'iscsi',
      inputDesc: 'Emulex iSCSI Device Driver for Windows - ##VERSION## - Release ##RELEASE##',
      ddFileName: ['be2iscsi.sys']
    },
    ddWinFC: {
      name: 'Windows FC Driver',
      regex: '^elx(?:\-lnvgy)?\_dd_fc_([^_]+)_windows',
      type: 'dd',
      os: 'windows',
      proto: 'fc',
      inputDesc: 'Emulex FC Device Driver for Windows - ##VERSION## - Release ##RELEASE##',
      ddFileName: ['elxfc.sys']
    },
    ddWinFCoE: {
      name: 'Windows FCoE Driver',
      regex: '^elx(?:\-lnvgy)?\_dd_cna_([^_]+)_windows',
      type: 'dd',
      os: 'windows',
      proto: 'cna',
      inputDesc: 'Emulex FCoE Device Driver for Windows - ##VERSION## - Release ##RELEASE##',
      ddFileName: ['elxcna.sys']
    },
    ddRHEL5NIC: {
      name: 'RHEL 5.x NIC Driver',
      regex: '^elx(?:\-lnvgy)?\_dd_nic_([^_]+)_rhel5',
      type: 'dd',
      os: 'linux',
      proto: 'nic',
      inputDesc: 'Emulex NIC (be2net) Device Driver for RHEL5 - ##VERSION## - Release ##RELEASE##',
      ddFileName: ['be2net.ko']
    },
    ddRHEL5ISCSI: {
      name: 'RHEL 5.x iSCSI Driver',
      regex: '^elx(?:\-lnvgy)?\_dd_iscsi_([^_]+)_rhel5',
      type: 'dd',
      os: 'linux',
      proto: 'iscsi',
      inputDesc: 'Emulex iSCSI (be2iscsi) Device Driver for RHEL5 - ##VERSION## - Release ##RELEASE##',
      ddFileName: ['be2iscsi.ko']
    },
    ddRHEL5FC: {
      name: 'RHEL 5.x FC Driver',
      regex: '^elx(?:\-lnvgy)?\_dd_fc_([^_]+)_rhel5',
      type: 'dd',
      os: 'linux',
      proto: 'fc',
      inputDesc: 'Emulex FC/FCoE (lpfc) Device Driver for RHEL5 - ##VERSION## - Release ##RELEASE##',
      ddFileName: ['lpfc.ko']
    },
    ddRHEL6NIC: {
      name: 'RHEL 6.x NIC Driver',
      regex: '^elx(?:\-lnvgy)?\_dd_nic_([^_]+)_rhel6',
      type: 'dd',
      os: 'linux',
      proto: 'nic',
      inputDesc: 'Emulex NIC (be2net) Device Driver for RHEL6 - ##VERSION## - Release ##RELEASE##',
      ddFileName: ['be2net.ko']
    },
    ddRHEL6ISCSI: {
      name: 'RHEL 6.x iSCSI Driver',
      regex: '^elx(?:\-lnvgy)?\_dd_iscsi_([^_]+)_rhel6',
      type: 'dd',
      os: 'linux',
      proto: 'iscsi',
      inputDesc: 'Emulex iSCSI (be2iscsi) Device Driver for RHEL6 - ##VERSION## - Release ##RELEASE##',
      ddFileName: ['be2iscsi.ko']
    },
    ddRHEL6FC: {
      name: 'RHEL 6.x FC Driver',
      regex: '^elx(?:\-lnvgy)?\_dd_fc_([^_]+)_rhel6',
      type: 'dd',
      os: 'linux',
      proto: 'fc',
      inputDesc: 'Emulex FC/FCoE (lpfc) Device Driver for RHEL6 - ##VERSION## - Release ##RELEASE##',
      ddFileName: ['lpfc.ko']
    },
    ddRHEL7NIC: {
      name: 'RHEL 7.x NIC Driver',
      regex: '^elx(?:\-lnvgy)?\_dd_nic_([^_]+)_rhel7',
      type: 'dd',
      os: 'linux',
      proto: 'nic',
      inputDesc: 'Emulex NIC (be2net) Device Driver for RHEL7 - ##VERSION## - Release ##RELEASE##',
      ddFileName: ['be2net.ko']
    },
    ddRHEL7ISCSI: {
      name: 'RHEL 7.x iSCSI Driver',
      regex: '^elx(?:\-lnvgy)?\_dd_iscsi_([^_]+)_rhel7',
      type: 'dd',
      os: 'linux',
      proto: 'iscsi',
      inputDesc: 'Emulex iSCSI (be2iscsi) Device Driver for RHEL7 - ##VERSION## - Release ##RELEASE##',
      ddFileName: ['be2iscsi.ko']
    },
    ddRHEL7FC: {
      name: 'RHEL 7.x FC Driver',
      regex: '^elx(?:\-lnvgy)?\_dd_fc_([^_]+)_rhel7',
      type: 'dd',
      os: 'linux',
      proto: 'fc',
      inputDesc: 'Emulex FC/FCoE (lpfc) Device Driver for RHEL7 - ##VERSION## - Release ##RELEASE##',
      ddFileName: ['lpfc.ko']
    },
    ddSLES10NIC: {
      name: 'SLES 10.x NIC Driver',
      regex: '^elx(?:\-lnvgy)?\_dd_nic_([^_]+)_sles10',
      type: 'dd',
      os: 'linux',
      proto: 'nic',
      inputDesc: 'Emulex NIC (be2net) Device Driver for SLES10 - ##VERSION## - Release ##RELEASE##',
      ddFileName: ['be2net.ko']
    },
    ddSLES10ISCSI: {
      name: 'SLES 10.x iSCSI Driver',
      regex: '^elx(?:\-lnvgy)?\_dd_iscsi_([^_]+)_sles10',
      type: 'dd',
      os: 'linux',
      proto: 'iscsi',
      inputDesc: 'Emulex iSCSI (be2iscsi) Device Driver for SLES10 - ##VERSION## - Release ##RELEASE##',
      ddFileName: ['be2iscsi.ko']
    },
    ddSLES10FC: {
      name: 'SLES 10.x FC Driver',
      regex: '^elx(?:\-lnvgy)?\_dd_fc_([^_]+)_sles10',
      type: 'dd',
      os: 'linux',
      proto: 'fc',
      inputDesc: 'Emulex FC/FCoE (lpfc) Device Driver for SLES10 - ##VERSION## - Release ##RELEASE##',
      ddFileName: ['lpfc.ko']
    },
    ddSLES11NIC: {
      name: 'SLES 11.x NIC Driver',
      regex: '^elx(?:\-lnvgy)?\_dd_nic_([^_]+)_sles11',
      type: 'dd',
      os: 'linux',
      proto: 'nic',
      inputDesc: 'Emulex NIC (be2net) Device Driver for SLES11 - ##VERSION## - Release ##RELEASE##',
      ddFileName: ['be2net.ko']
    },
    ddSLES11ISCSI: {
      name: 'SLES 11.x iSCSI Driver',
      regex: '^elx(?:\-lnvgy)?\_dd_iscsi_([^_]+)_sles11',
      type: 'dd',
      os: 'linux',
      proto: 'iscsi',
      inputDesc: 'Emulex iSCSI (be2iscsi) Device Driver for SLES11 - ##VERSION## - Release ##RELEASE##',
      ddFileName: ['be2iscsi.ko']
    },
    ddSLES11FC: {
      name: 'SLES 11.x FC Driver',
      regex: '^elx(?:\-lnvgy)?\_dd_fc_([^_]+)_sles11',
      type: 'dd',
      os: 'linux',
      proto: 'fc',
      inputDesc: 'Emulex FC/FCoE (lpfc) Device Driver for SLES11 - ##VERSION## - Release ##RELEASE##',
      ddFileName: ['lpfc.ko']
    },
    ddSLES12NIC: {
      name: 'SLES 12.x NIC Driver',
      regex: '^elx(?:\-lnvgy)?\_dd_nic_([^_]+)_sles12',
      type: 'dd',
      os: 'linux',
      proto: 'nic',
      inputDesc: 'Emulex NIC (be2net) Device Driver for SLES12 - ##VERSION## - Release ##RELEASE##',
      ddFileName: ['be2net.ko']
    },
    ddSLES12ISCSI: {
      name: 'SLES 12.x iSCSI Driver',
      regex: '^elx(?:\-lnvgy)?\_dd_iscsi_([^_]+)_sles12',
      type: 'dd',
      os: 'linux',
      proto: 'iscsi',
      inputDesc: 'Emulex iSCSI (be2iscsi) Device Driver for SLES12 - ##VERSION## - Release ##RELEASE##',
      ddFileName: ['be2iscsi.ko']
    },
    ddSLES12FC: {
      name: 'SLES 12.x FC Driver',
      regex: '^elx(?:\-lnvgy)?\_dd_fc_([^_]+)_sles12',
      type: 'dd',
      os: 'linux',
      proto: 'fc',
      inputDesc: 'Emulex FC/FCoE (lpfc) Device Driver for SLES12 - ##VERSION## - Release ##RELEASE##',
      ddFileName: ['lpfc.ko']
    },
    fwBE3Linux: {
      name: 'Linux BE Firmware',
      regex: '^elx(?:\-lnvgy)?\_fw_cna_([A-Za-z0-9]+\-oc11\-[0-9\.]+\-[0-9]+)_linux',
      type: 'fw',
      os: 'linux',
      asic: 'BE3',
      preVersion: 'oc11-',
      inputDesc: 'Emulex OCe11xxx UCNA Firmware Update for Linux - ##VERSION## - Release ##RELEASE##'
    },
    fwBE3VMware: {
      name: 'VMware BE Firmware',
      regex: '^elx(?:\-lnvgy)?\_fw_cna_([A-Za-z0-9]+\-oc11\-[0-9\.]+\-[0-9]+)_vmware',
      type: 'fw',
      os: 'vmware',
      asic: 'BE3',
      preVersion: 'oc11-',
      inputDesc: 'Emulex OCe11xxx UCNA Firmware Update for VMware - ##VERSION## - Release ##RELEASE##'
    },
    fwBE3Windows: {
      name: 'Windows BE Firmware',
      regex: '^elx(?:\-lnvgy)?\_fw_cna_([A-Za-z0-9]+\-oc11\-[0-9\.]+\-[0-9]+)_windows',
      type: 'fw',
      os: 'windows',
      asic: 'BE3',
      preVersion: 'oc11-',
      inputDesc: 'Emulex OCe11xxx UCNA Firmware Update for Windows - ##VERSION## - Release ##RELEASE##'
    },
    fwLancerLinux: {
      name: 'Linux Lancer Firmware',
      regex: '^elx(?:\-lnvgy)?\_fw_fc_([A-Za-z0-9]+\-[0-9\.]+\-[0-9]+)_linux',
      type: 'fw',
      os: 'linux',
      asic: 'Lancer',
      inputDesc: 'Emulex HBA (LPe1600x) Firmware Update for Linux - ##VERSION## - Release ##RELEASE##'
    },
    fwLancerVMware: {
      name: 'VMware Lancer Firmware',
      regex: '^elx(?:\-lnvgy)?\_fw_fc_([A-Za-z0-9]+\-[0-9\.]+\-[0-9]+)_vmware',
      type: 'fw',
      os: 'vmware',
      asic: 'Lancer',
      inputDesc: 'Emulex HBA (LPe1600x) Firmware Update for VMware - ##VERSION## - Release ##RELEASE##'
    },
    fwLancerWindows: {
      name: 'Windows Lancer Firmware',
      regex: '^elx(?:\-lnvgy)?\_fw_fc_([A-Za-z0-9]+\-[0-9\.]+\-[0-9]+)_windows',
      type: 'fw',
      os: 'windows',
      asic: 'Lancer',
      inputDesc: 'Emulex HBA (LPe1600x) Firmware Update for Windows - ##VERSION## - Release ##RELEASE##'
    },
    fwSaturnLinux: {
      name: 'Linux Saturn Firmware',
      regex: '^elx(?:\-lnvgy)?\_fw_fc_([A-Za-z0-9]+\-[0-9\.]+[xa][0-9]+\-[0-9]+)_linux',
      type: 'fw',
      os: 'linux',
      asic: 'Saturn',
      postVersion: '([0-9\.]+[xa][0-9]+)\-([0-9\.]+[xa][0-9]+)',
      inputDesc: 'Emulex HBA (LPe1205/LPe1200x) Firmware Update for Linux - ##VERSION## - Release ##RELEASE##'
    },
    fwSaturnVMware: {
      name: 'VMware Saturn Firmware',
      regex: '^elx(?:\-lnvgy)?\_fw_fc_([A-Za-z0-9]+\-[0-9\.]+[xa][0-9]+\-[0-9]+)_vmware',
      fwRegex: '([0-9\.]+[xa][0-9]+)\-([0-9\.]+[xa][0-9]+)',
      type: 'fw',
      os: 'vmware',
      asic: 'Saturn',
      postVersion: '([0-9\.]+[xa][0-9]+)\-([0-9\.]+[xa][0-9]+)',
      inputDesc: 'Emulex HBA (LPe1205/LPe1200x) Firmware Update for VMware - ##VERSION## - Release ##RELEASE##'
    },
    fwSaturnWindows: {
      name: 'Windows Saturn Firmware',
      regex: '^elx(?:\-lnvgy)?\_fw_fc_([A-Za-z0-9]+\-[0-9\.]+[xa][0-9]+\-[0-9]+)_windows',
      fwRegex: '([0-9\.]+[xa][0-9]+)\-([0-9\.]+[xa][0-9]+)',
      type: 'fw',
      os: 'windows',
      asic: 'Saturn',
      postVersion: '([0-9\.]+[xa][0-9]+)\-([0-9\.]+[xa][0-9]+)',
      inputDesc: 'Emulex HBA (LPe1205/LPe1200x) Firmware Update for Windows - ##VERSION## - Release ##RELEASE##'
    },
    fwSkyhawkLinux: {
      name: 'Linux Skyhawk Firmware',
      regex: '^elx(?:\-lnvgy)?\_fw_cna_([A-Za-z0-9]+\-oc14\-[0-9\.]+\-[0-9]+)_linux',
      type: 'fw',
      os: 'linux',
      asic: 'Skyhawk',
      preVersion: 'oc14-',
      inputDesc: 'Emulex OCe14xxx UCNA Firmware Update for Linux - ##VERSION## - Release ##RELEASE##'
    },
    fwSkyhawkVMware: {
      name: 'VMware Skyhawk Firmware',
      regex: '^elx(?:\-lnvgy)?\_fw_cna_([A-Za-z0-9]+\-oc14\-[0-9\.]+\-[0-9]+)_vmware',
      type: 'fw',
      os: 'vmware',
      asic: 'Skyhawk',
      preVersion: 'oc14-',
      inputDesc: 'Emulex OCe14xxx UCNA Firmware Update for VMware - ##VERSION## - Release ##RELEASE##'
    },
    fwSkyhawkWindows: {
      name: 'Windows Skyhawk Firmware',
      regex: '^elx(?:\-lnvgy)?\_fw_cna_([A-Za-z0-9]+\-oc14\-[0-9\.]+\-[0-9]+)_windows',
      type: 'fw',
      os: 'windows',
      asic: 'Skyhawk',
      preVersion: 'oc14-',
      inputDesc: 'Emulex OCe14xxx UCNA Firmware Update for Windows - ##VERSION## - Release ##RELEASE##'
    },
  },

  // All header search strings used to find relevant sections
  headerStr: {
    relName: 'release: ',
    relType: 'type: ',
    osList: 'operating systems',
    systemList: 'machine types',
    adapterList: 'adapter models',
    ddWinNIC: 'win nic dd',
    ddWinISCSI: 'win iscsi dd',
    ddWinFC: 'win fc dd',
    ddWinFCoE: 'win fcoe dd',
    ddLinNIC: 'linux nic dd',
    ddLinISCSI: 'linux iscsi dd',
    ddLinFC: 'linux fc/fcoe dd',
    fwSaturn: 'saturn fw',
    fwLancer: 'lancer fw',
    fwBE3: 'be fw',
    fwSkyhawk: 'skyhawk fw',
    systemType: ['rack', 'flex'], // System type headers (ignored but need to be tracked)
  }

};