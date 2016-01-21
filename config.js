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
  // If two entries contain the same 'name' data (e.g. Lancer and Lancer G6), the more precise
  // entry (i.e. Lancer G6) must be listed first.
  asicTypes: [
    {
      name: 'BE3',
      type: 'cna',
      agentlessCfgNames: {
        13: 'BE3_AG-BOARDS'
      },
      fwCfgNames: {
        rack: 'oc11',
        flex: 'oc11',
        bladecenter: 'oc11'
      },
      fwMatrixNames: {
        rack: ['OCe11100-FCoE', 'OCe11100-iSCSI', 'OCe11100-NIC'],
        flex: ['OCe11100-FCoE', 'OCe11100-iSCSI', 'OCe11100-NIC'],
        bladecenter: ['OCe11100-FCoE', 'OCe11100-iSCSI', 'OCe11100-NIC'],
      }
    },
    {
      name: 'Lancer G6',
      type: 'fc',
      agentlessCfgNames: {
        13: 'LANG6_AG-BOARDS'
      },
      fwCfgNames: {
        rack: 'A6',
        flex: 'A6',
        bladecenter: 'A6'
      },
      fwMatrixNames: {
        rack: ['LPe31000', 'LPe31002', 'LPe32000', 'LPe32002'],
        flex: [],
        bladecenter: [],
      }
    },
    {
      name: 'Lancer G5',
      type: 'fc',
      agentlessCfgNames: {
        13: 'LANG5_AG-BOARDS'
      },
      fwCfgNames: {
        rack: 'A5',
        flex: 'A5',
        bladecenter: 'A5'
      },
      fwMatrixNames: {
        rack: ['LPe16000', 'LPe16002'],
        flex: ['LPm16002', 'LPm16004'],
        bladecenter: [],
      }
    },
    {
      name: 'Saturn',
      type: 'fc',
      agentlessCfgNames: {
        10: 'SAT_AG-BOARDS',
        32773: 'SAT_BOOT_AG-BOARDS'
      },
      fwCfgNames: {
        rack: 'ud',
        flex: 'uf',
        bladecenter: 'uf'
      },
      bootCfgNames: {
        rack: 'UU',
        flex: 'UU',
        bladecenter: 'UU'
      },
      fwMatrixNames: {
        rack: ['LPe12000', 'LPe12002'],
        flex: ['LPe1205'],
        bladecenter: ['LPe1205'],
      }
    },
    {
      name: 'Skyhawk',
      type: 'cna',
      agentlessCfgNames: {
        13: 'SKY_AG-BOARDS'
      },
      fwCfgNames: {
        rack: 'oc14',
        flex: 'oc14',
        bladecenter: 'oc14'
      },
      fwMatrixNames: {
        rack: ['OCe14100-FCoE', 'OCe14100-iSCSI', 'OCe14100-NIC'],
        flex: ['OCe14100-FCoE', 'OCe14100-iSCSI', 'OCe14100-NIC'],
        bladecenter: [],
      }
    },
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
    {name: 'elx_Zeppelin_1p_2p_FC', value: 'PCI\VEN_10DF&DEV_FE00&SUBSYS_FE0010DF', type: 'fc'},

    // Saturn
    {name: 'elx_Tetra_FC',          value: 'PCI\VEN_10DF&DEV_F100&SUBSYS_F12410DF', type: 'fc'},
    {name: 'elx_Rhea_FC',           value: 'PCI\VEN_10DF&DEV_F100&SUBSYS_F13010DF', type: 'fc'},
    {name: 'elx_Heritage_1p_2p_FC', value: 'PCI\VEN_10DF&DEV_F100&SUBSYS_F10010DF', type: 'fc'},

    // BE2 NIC
    {name: 'elx_Mirage1_N',         value: 'PCI\VEN_19A2&DEV_0700&SUBSYS_E62810DF', type: 'nic'},
    {name: 'elx_Endeavor1_N',       value: 'PCI\VEN_19A2&DEV_0700&SUBSYS_E62910DF', type: 'nic'},
    {name: 'elx_Eraptor1_N',        value: 'PCI\VEN_19A2&DEV_0700&SUBSYS_E63010DF', type: 'nic'},
    {name: 'elx_Eraptor1Adv_N',     value: 'PCI\VEN_19A2&DEV_0700&SUBSYS_E65010DF', type: 'nic'},

    // BE2 iSCSI
    {name: 'elx_Mirage1_I',         value: 'PCI\VEN_19A2&DEV_0702&SUBSYS_E62810DF', type: 'iscsi'},
    {name: 'elx_Endeavor1_I',       value: 'PCI\VEN_19A2&DEV_0702&SUBSYS_E62910DF', type: 'iscsi'},
    {name: 'elx_Eraptor1_I',        value: 'PCI\VEN_19A2&DEV_0702&SUBSYS_E63010DF', type: 'iscsi'},
    {name: 'elx_Eraptor1Adv_I',     value: 'PCI\VEN_19A2&DEV_0702&SUBSYS_E65010DF', type: 'iscsi'},

    // BE2 FCoE
    {name: 'elx_Mirage1_F',         value: 'PCI\VEN_19A2&DEV_0704&SUBSYS_E62810DF', type: 'fcoe'},
    {name: 'elx_Endeavor1_F',       value: 'PCI\VEN_19A2&DEV_0704&SUBSYS_E62910DF', type: 'fcoe'},
    {name: 'elx_Eraptor1_F',        value: 'PCI\VEN_19A2&DEV_0704&SUBSYS_E63010DF', type: 'fcoe'},
    {name: 'elx_Eraptor1Adv_F',     value: 'PCI\VEN_19A2&DEV_0704&SUBSYS_E65010DF', type: 'fcoe'},

    // BE3 NIC
    {name: 'elx_Turnberry',         value: 'PCI\VEN_19A2&DEV_0710&SUBSYS_E70E10DF', type: 'nic'},
    {name: 'elx_Endeavor2_N',       value: 'PCI\VEN_19A2&DEV_0710&SUBSYS_E72810DF', type: 'nic'},
    {name: 'elx_Mirage2_N',         value: 'PCI\VEN_19A2&DEV_0710&SUBSYS_E72910DF', type: 'nic'},
    {name: 'elx_Endeavor3_N',       value: 'PCI\VEN_19A2&DEV_0710&SUBSYS_E72A10DF', type: 'nic'},
    {name: 'elx_Eraptor2_N',        value: 'PCI\VEN_19A2&DEV_0710&SUBSYS_E73010DF', type: 'nic'},
    {name: 'elx_Wildcatx_N',        value: 'PCI\VEN_19A2&DEV_0710&SUBSYS_E73110DF', type: 'nic'},
    {name: 'elx_Robalo_N',          value: 'PCI\VEN_19A2&DEV_0710&SUBSYS_E73510DF', type: 'nic'},
    {name: 'elx_Eraptor2Adv_N',     value: 'PCI\VEN_19A2&DEV_0710&SUBSYS_E75010DF', type: 'nic'},
    {name: 'elx_Endeavor2Adv_N',    value: 'PCI\VEN_19A2&DEV_0710&SUBSYS_E70810DF', type: 'nic'},
    {name: 'elx_Blacktip_N',        value: 'PCI\VEN_19A2&DEV_0710&SUBSYS_E70B10DF', type: 'nic'},
    {name: 'elx_Blacktip_Red_N',    value: 'PCI\VEN_19A2&DEV_0710&SUBSYS_E75810DF', type: 'nic'},
    {name: 'elx_Congo_N',           value: 'PCI\VEN_19A2&DEV_0710&SUBSYS_E70F10DF', type: 'nic'},
    {name: 'elx_USI_ES_N',          value: 'PCI\VEN_19A2&DEV_0710&SUBSYS_E71B10DF', type: 'nic'},
    {name: 'elx_RobaloAdv_N',       value: 'PCI\VEN_19A2&DEV_0710&SUBSYS_E71510DF', type: 'nic'},
    {name: 'elx_Reno_N',            value: 'PCI\VEN_19A2&DEV_0710&SUBSYS_E70C10DF', type: 'nic'},
    {name: 'elx_Tigershark_N',      value: 'PCI\VEN_19A2&DEV_0710&SUBSYS_E70A10DF', type: 'nic'},
    {name: 'elx_Penguin_N',         value: 'PCI\VEN_19A2&DEV_0710&SUBSYS_E71710DF', type: 'nic'},
    {name: 'elx_Eagle_N',           value: 'PCI\VEN_19A2&DEV_0710&SUBSYS_E71910DF', type: 'nic'},

    // BE3 iSCSI
    {name: 'elx_Endeavor2_I',       value: 'PCI\VEN_19A2&DEV_0712&SUBSYS_E72810DF', type: 'iscsi'},
    {name: 'elx_Mirage2_I',         value: 'PCI\VEN_19A2&DEV_0712&SUBSYS_E72910DF', type: 'iscsi'},
    {name: 'elx_Endeavor3_I',       value: 'PCI\VEN_19A2&DEV_0712&SUBSYS_E72A10DF', type: 'iscsi'},
    {name: 'elx_Eraptor2_I',        value: 'PCI\VEN_19A2&DEV_0712&SUBSYS_E73010DF', type: 'iscsi'},
    {name: 'elx_Wildcatx_I',        value: 'PCI\VEN_19A2&DEV_0712&SUBSYS_E73110DF', type: 'iscsi'},
    {name: 'elx_Robalo_I',          value: 'PCI\VEN_19A2&DEV_0712&SUBSYS_E73510DF', type: 'iscsi'},
    {name: 'elx_Eraptor2Adv_I',     value: 'PCI\VEN_19A2&DEV_0712&SUBSYS_E75010DF', type: 'iscsi'},
    {name: 'elx_Endeavor2Adv_I',    value: 'PCI\VEN_19A2&DEV_0712&SUBSYS_E70810DF', type: 'iscsi'},
    {name: 'elx_Blacktip_I',        value: 'PCI\VEN_19A2&DEV_0712&SUBSYS_E70B10DF', type: 'iscsi'},
    {name: 'elx_Blacktip_Red_I',    value: 'PCI\VEN_19A2&DEV_0712&SUBSYS_E75810DF', type: 'iscsi'},
    {name: 'elx_Congo_I',           value: 'PCI\VEN_19A2&DEV_0712&SUBSYS_E70F10DF', type: 'iscsi'},
    {name: 'elx_USI_ES_I',          value: 'PCI\VEN_19A2&DEV_0712&SUBSYS_E71B10DF', type: 'iscsi'},
    {name: 'elx_RobaloAdv_I',       value: 'PCI\VEN_19A2&DEV_0712&SUBSYS_E71510DF', type: 'iscsi'},
    {name: 'elx_Reno_I',            value: 'PCI\VEN_19A2&DEV_0712&SUBSYS_E70C10DF', type: 'iscsi'},
    {name: 'elx_Tigershark_I',      value: 'PCI\VEN_19A2&DEV_0712&SUBSYS_E70A10DF', type: 'iscsi'},
    {name: 'elx_Penguin_I',         value: 'PCI\VEN_19A2&DEV_0712&SUBSYS_E71710DF', type: 'iscsi'},
    {name: 'elx_Eagle_I',           value: 'PCI\VEN_19A2&DEV_0712&SUBSYS_E71910DF', type: 'iscsi'},

    // BE3 FCoE
    {name: 'elx_Endeavor2_F',       value: 'PCI\VEN_19A2&DEV_0714&SUBSYS_E72810DF', type: 'fcoe'},
    {name: 'elx_Mirage2_F',         value: 'PCI\VEN_19A2&DEV_0714&SUBSYS_E72910DF', type: 'fcoe'},
    {name: 'elx_Endeavor3_F',       value: 'PCI\VEN_19A2&DEV_0714&SUBSYS_E72A10DF', type: 'fcoe'},
    {name: 'elx_Eraptor2_F',        value: 'PCI\VEN_19A2&DEV_0714&SUBSYS_E73010DF', type: 'fcoe'},
    {name: 'elx_Wildcatx_F',        value: 'PCI\VEN_19A2&DEV_0714&SUBSYS_E73110DF', type: 'fcoe'},
    {name: 'elx_Robalo_F',          value: 'PCI\VEN_19A2&DEV_0714&SUBSYS_E73510DF', type: 'fcoe'},
    {name: 'elx_Eraptor2Adv_F',     value: 'PCI\VEN_19A2&DEV_0714&SUBSYS_E75010DF', type: 'fcoe'},
    {name: 'elx_Endeavor2Adv_F',    value: 'PCI\VEN_19A2&DEV_0714&SUBSYS_E70810DF', type: 'fcoe'},
    {name: 'elx_Blacktip_F',        value: 'PCI\VEN_19A2&DEV_0714&SUBSYS_E70B10DF', type: 'fcoe'},
    {name: 'elx_Blacktip_Red_F',    value: 'PCI\VEN_19A2&DEV_0714&SUBSYS_E75810DF', type: 'fcoe'},
    {name: 'elx_Congo_F',           value: 'PCI\VEN_19A2&DEV_0714&SUBSYS_E70F10DF', type: 'fcoe'},
    {name: 'elx_USI_ES_F',          value: 'PCI\VEN_19A2&DEV_0714&SUBSYS_E71B10DF', type: 'fcoe'},
    {name: 'elx_RobaloAdv_F',       value: 'PCI\VEN_19A2&DEV_0714&SUBSYS_E71510DF', type: 'fcoe'},
    {name: 'elx_Reno_F',            value: 'PCI\VEN_19A2&DEV_0714&SUBSYS_E70C10DF', type: 'fcoe'},
    {name: 'elx_Tigershark_F',      value: 'PCI\VEN_19A2&DEV_0714&SUBSYS_E70A10DF', type: 'fcoe'},
    {name: 'elx_Penguin_F',         value: 'PCI\VEN_19A2&DEV_0714&SUBSYS_E71710DF', type: 'fcoe'},
    {name: 'elx_Eagle_F',           value: 'PCI\VEN_19A2&DEV_0714&SUBSYS_E71910DF', type: 'fcoe'},

    // Lancer G5
    {name: 'elx_Vanguard_FC',       value: 'PCI\VEN_10DF&DEV_E200&SUBSYS_E20210DF', type: 'fc'},
    {name: 'elx_VanguardDL_FC',     value: 'PCI\VEN_10DF&DEV_E200&SUBSYS_E28210DF', type: 'fc'},
    {name: 'elx_Chameleon1P_FC',    value: 'PCI\VEN_10DF&DEV_E200&SUBSYS_E20310DF', type: 'fc'},
    {name: 'elx_Chameleon2P_FC',    value: 'PCI\VEN_10DF&DEV_E200&SUBSYS_E20410DF', type: 'fc'},

    // Lancer G6
    {name: 'elx_Croydon1P_FC',      value: 'PCI\VEN_10DF&DEV_E300&SUBSYS_E33310DF', type: 'fc'},
    {name: 'elx_Croydon2P_FC',      value: 'PCI\VEN_10DF&DEV_E300&SUBSYS_E33210DF', type: 'fc'},

    // Skyhawk NIC
    {name: 'elx_Silver_N',          value: 'PCI\VEN_10DF&DEV_0720&SUBSYS_E81010DF', type: 'nic'},
    {name: 'elx_Silver_P2_N',       value: 'PCI\VEN_10DF&DEV_0720&SUBSYS_E81F10DF', type: 'nic'},
    {name: 'elx_Skyeagle_N',        value: 'PCI\VEN_10DF&DEV_0720&SUBSYS_E81110DF', type: 'nic'},
    {name: 'elx_Newport_N',         value: 'PCI\VEN_10DF&DEV_0720&SUBSYS_E81210DF', type: 'nic'},
    {name: 'elx_Braddock_N',        value: 'PCI\VEN_10DF&DEV_0720&SUBSYS_E81310DF', type: 'nic'},
    {name: 'elx_Skybird_N',         value: 'PCI\VEN_10DF&DEV_0720&SUBSYS_E81510DF', type: 'nic'},
    {name: 'elx_Skybird_P2_N',      value: 'PCI\VEN_10DF&DEV_0720&SUBSYS_E81B10DF', type: 'nic'},
    {name: 'elx_Skybird_P2_4p_N',   value: 'PCI\VEN_10DF&DEV_0720&SUBSYS_E81A10DF', type: 'nic'},
    {name: 'elx_Gold_N',            value: 'PCI\VEN_10DF&DEV_0720&SUBSYS_E81610DF', type: 'nic'},
    {name: 'elx_Gold_Lite_N',       value: 'PCI\VEN_10DF&DEV_0720&SUBSYS_E81710DF', type: 'nic'},
    {name: 'elx_Gold_Plus_N',       value: 'PCI\VEN_10DF&DEV_0720&SUBSYS_E81810DF', type: 'nic'},
    {name: 'elx_Gold_Plus_P2_N',    value: 'PCI\VEN_10DF&DEV_0720&SUBSYS_E81E10DF', type: 'nic'},
    {name: 'elx_Gold_P2_N',         value: 'PCI\VEN_10DF&DEV_0720&SUBSYS_E81C10DF', type: 'nic'},

    // Skyhawk iSCSI
    {name: 'elx_Silver_I',          value: 'PCI\VEN_10DF&DEV_0722&SUBSYS_E81010DF', type: 'iscsi'},
    {name: 'elx_Silver_P2_I',       value: 'PCI\VEN_10DF&DEV_0722&SUBSYS_E81F10DF', type: 'iscsi'},
    {name: 'elx_Skyeagle_I',        value: 'PCI\VEN_10DF&DEV_0722&SUBSYS_E81110DF', type: 'iscsi'},
    {name: 'elx_Newport_I',         value: 'PCI\VEN_10DF&DEV_0722&SUBSYS_E81210DF', type: 'iscsi'},
    {name: 'elx_Braddock_I',        value: 'PCI\VEN_10DF&DEV_0722&SUBSYS_E81310DF', type: 'iscsi'},
    {name: 'elx_Skybird_I',         value: 'PCI\VEN_10DF&DEV_0722&SUBSYS_E81510DF', type: 'iscsi'},
    {name: 'elx_Skybird_P2_I',      value: 'PCI\VEN_10DF&DEV_0722&SUBSYS_E81B10DF', type: 'iscsi'},
    {name: 'elx_Skybird_P2_4p_I',   value: 'PCI\VEN_10DF&DEV_0722&SUBSYS_E81A10DF', type: 'iscsi'},
    {name: 'elx_Gold_I',            value: 'PCI\VEN_10DF&DEV_0722&SUBSYS_E81610DF', type: 'iscsi'},
    {name: 'elx_Gold_Lite_I',       value: 'PCI\VEN_10DF&DEV_0722&SUBSYS_E81710DF', type: 'iscsi'},
    {name: 'elx_Gold_Plus_I',       value: 'PCI\VEN_10DF&DEV_0722&SUBSYS_E81810DF', type: 'iscsi'},
    {name: 'elx_Gold_Plus_P2_I',    value: 'PCI\VEN_10DF&DEV_0722&SUBSYS_E81E10DF', type: 'iscsi'},
    {name: 'elx_Gold_P2_I',         value: 'PCI\VEN_10DF&DEV_0722&SUBSYS_E81C10DF', type: 'iscsi'},

    // Skyhawk FCoE
    {name: 'elx_Silver_F',          value: 'PCI\VEN_10DF&DEV_0724&SUBSYS_E81010DF', type: 'fcoe'},
    {name: 'elx_Silver_P2_F',       value: 'PCI\VEN_10DF&DEV_0724&SUBSYS_E81F10DF', type: 'fcoe'},
    {name: 'elx_Skyeagle_F',        value: 'PCI\VEN_10DF&DEV_0724&SUBSYS_E81110DF', type: 'fcoe'},
    {name: 'elx_Newport_F',         value: 'PCI\VEN_10DF&DEV_0724&SUBSYS_E81210DF', type: 'fcoe'},
    {name: 'elx_Braddock_F',        value: 'PCI\VEN_10DF&DEV_0724&SUBSYS_E81310DF', type: 'fcoe'},
    {name: 'elx_Skybird_F',         value: 'PCI\VEN_10DF&DEV_0724&SUBSYS_E81510DF', type: 'fcoe'},
    {name: 'elx_Skybird_P2_F',      value: 'PCI\VEN_10DF&DEV_0724&SUBSYS_E81B10DF', type: 'fcoe'},
    {name: 'elx_Skybird_P2_4p_F',   value: 'PCI\VEN_10DF&DEV_0724&SUBSYS_E81A10DF', type: 'fcoe'},
    {name: 'elx_Gold_F',            value: 'PCI\VEN_10DF&DEV_0724&SUBSYS_E81610DF', type: 'fcoe'},
    {name: 'elx_Gold_Lite_F',       value: 'PCI\VEN_10DF&DEV_0724&SUBSYS_E81710DF', type: 'fcoe'},
    {name: 'elx_Gold_Plus_F',       value: 'PCI\VEN_10DF&DEV_0724&SUBSYS_E81810DF', type: 'fcoe'},
    {name: 'elx_Gold_Plus_P2_F',    value: 'PCI\VEN_10DF&DEV_0724&SUBSYS_E81E10DF', type: 'fcoe'},
    {name: 'elx_Gold_P2_F',         value: 'PCI\VEN_10DF&DEV_0724&SUBSYS_E81C10DF', type: 'fcoe'},
  ],

  // Package types and their expected FixIDs
  pkgTypes: {
    ddWinNIC: {
      name: 'Windows NIC Driver',
      regex: '^elx(?:\-lnvgy)?\_dd_nic_([^_]+)_windows',
      type: 'dd',
      os: 'windows',
      osType: 'windows',
      proto: 'nic',
      inputDesc: 'Emulex NIC Device Driver for Windows - ##VERSION## - Release ##RELEASE##',
      ddFileName: ['ocnd63.sys', 'ocnd64.sys'],
      ddVerFormat: '##VERSION##',
      appDevIdCfgName: 'Win NIC DD',
      ddImageFileSearch: 'elxdrvr\-nic\-([0-9\.]+)\-([0-9]+)\.exe',
      ddImageFileReplace: '$1',
      ocmImageFileSearch: 'elxocmcore\-windows\-(x86|x64)\-([0-9\.]+)\-([0-9]+)\.exe',
      ocmImageFileReplace: '$2'
    },
    ddWinISCSI: {
      name: 'Windows iSCSI Driver',
      regex: '^elx(?:\-lnvgy)?\_dd_iscsi_([^_]+)_windows',
      type: 'dd',
      os: 'windows',
      osType: 'windows',
      proto: 'iscsi',
      inputDesc: 'Emulex iSCSI Device Driver for Windows - ##VERSION## - Release ##RELEASE##',
      ddFileName: ['be2iscsi.sys'],
      ddVerFormat: '##VERSION##',
      appDevIdCfgName: 'Win iSCSI DD',
      ddImageFileSearch: 'elxdrvr\-iscsi\-([0-9\.]+)\-([0-9]+)\.exe',
      ddImageFileReplace: '$1'
    },
    ddWinFC: {
      name: 'Windows FC Driver',
      regex: '^elx(?:\-lnvgy)?\_dd_fc_([^_]+)_windows',
      type: 'dd',
      os: 'windows',
      osType: 'windows',
      proto: 'fc',
      inputDesc: 'Emulex FC Device Driver for Windows - ##VERSION## - Release ##RELEASE##',
      ddFileName: ['elxfc.sys'],
      ddVerFormat: '##VERSION##',
      appDevIdCfgName: 'Win FC DD',
      ddImageFileSearch: 'elxdrvr\-fc\-([0-9\.]+)\-([0-9]+)\.exe',
      ddImageFileReplace: '$1'
    },
    ddWinFCoE: {
      name: 'Windows FCoE Driver',
      regex: '^elx(?:\-lnvgy)?\_dd_cna_([^_]+)_windows',
      type: 'dd',
      os: 'windows',
      osType: 'windows',
      proto: 'cna',
      inputDesc: 'Emulex FCoE Device Driver for Windows - ##VERSION## - Release ##RELEASE##',
      ddFileName: ['elxcna.sys'],
      ddVerFormat: '##VERSION##',
      appDevIdCfgName: 'Win FCoE DD',
      ddImageFileSearch: 'elxdrvr\-fcoe\-([0-9\.]+)\-([0-9]+)\.exe',
      ddImageFileReplace: '$1'
    },
    ddRHEL5NIC: {
      name: 'RHEL 5.x NIC Driver',
      regex: '^elx(?:\-lnvgy)?\_dd_nic_([^_]+)_rhel5',
      type: 'dd',
      os: 'rhel5',
      osType: 'linux',
      proto: 'nic',
      inputDesc: 'Emulex NIC (be2net) Device Driver for RHEL5 - ##VERSION## - Release ##RELEASE##',
      ddFileName: ['be2net.ko'],
      ddVerFormat: '##VERSION##',
      appDevIdCfgName: 'Linux NIC DD',
      dudImageFileSearch: 'elx\-be2net_([0-9\.]+)\-rhel5u([0-9])\-(i386|x86_64)\-[0-9]+\.iso',
      dudImageFileVersion: '$1',
      dudImageFileSP: '$2',
      dudImageFileArch: '$3',
      ocmImageFileSearch: [
        'elxocmcore\-([0-9\.]+)\-([0-9]+)\.(i386|x86_64)\.rpm',
        'elxocmcorelibs\-([0-9\.]+)\-([0-9]+)\.(i386|x86_64)\.rpm',
        'elxocmlibhbaapi(?:\-32bit)?\-([0-9\.]+)\-([0-9]+)\.(i386|x86_64)\.rpm'
      ],
      ocmImageFileVersion: '$1',
      ocmImageFileArch: '$3'
    },
    ddRHEL5ISCSI: {
      name: 'RHEL 5.x iSCSI Driver',
      regex: '^elx(?:\-lnvgy)?\_dd_iscsi_([^_]+)_rhel5',
      type: 'dd',
      os: 'rhel5',
      osType: 'linux',
      proto: 'iscsi',
      inputDesc: 'Emulex iSCSI (be2iscsi) Device Driver for RHEL5 - ##VERSION## - Release ##RELEASE##',
      ddFileName: ['be2iscsi.ko'],
      ddVerFormat: '##VERSION##',
      appDevIdCfgName: 'Linux iSCSI DD',
      dudImageFileSearch: 'elx\-be2iscsi_([0-9\.]+)\-rhel5u([0-9])\-(i386|x86_64)\-[0-9]+\.iso',
      dudImageFileVersion: '$1',
      dudImageFileSP: '$2',
      dudImageFileArch: '$3',
    },
    ddRHEL5FC: {
      name: 'RHEL 5.x FC/FCoE Driver',
      regex: '^elx(?:\-lnvgy)?\_dd_fc_([^_]+)_rhel5',
      type: 'dd',
      os: 'rhel5',
      osType: 'linux',
      proto: 'fc',
      inputDesc: 'Emulex FC/FCoE (lpfc) Device Driver for RHEL5 - ##VERSION## - Release ##RELEASE##',
      ddFileName: ['lpfc.ko'],
      ddVerFormat: '0:##VERSION##',
      appDevIdCfgName: 'Linux FC/FCoE DD',
      dudImageFileSearch: 'elx\-lpfc_([0-9\.]+)\-rhel5u([0-9])\-(i386|x86_64)\-[0-9]+\.iso',
      dudImageFileVersion: '$1',
      dudImageFileSP: '$2',
      dudImageFileArch: '$3',
    },
    ddRHEL6NIC: {
      name: 'RHEL 6.x NIC Driver',
      regex: '^elx(?:\-lnvgy)?\_dd_nic_([^_]+)_rhel6',
      type: 'dd',
      os: 'rhel6',
      osType: 'linux',
      proto: 'nic',
      inputDesc: 'Emulex NIC (be2net) Device Driver for RHEL6 - ##VERSION## - Release ##RELEASE##',
      ddFileName: ['be2net.ko'],
      ddVerFormat: '##VERSION##',
      appDevIdCfgName: 'Linux NIC DD',
      dudImageFileSearch: 'elx\-be2net_([0-9\.]+)\-rhel6u([0-9])\-(i386|x86_64)\-[0-9]+\.iso',
      dudImageFileVersion: '$1',
      dudImageFileSP: '$2',
      dudImageFileArch: '$3',
      ocmImageFileSearch: [
        'elxocmcore\-([0-9\.]+)\-([0-9]+)\.(i386|x86_64)\.rpm',
        'elxocmcorelibs\-([0-9\.]+)\-([0-9]+)\.(i386|x86_64)\.rpm',
        'elxocmlibhbaapi(?:\-32bit)?\-([0-9\.]+)\-([0-9]+)\.(i386|x86_64)\.rpm'
      ],
      ocmImageFileVersion: '$1',
      ocmImageFileArch: '$3'
    },
    ddRHEL6ISCSI: {
      name: 'RHEL 6.x iSCSI Driver',
      regex: '^elx(?:\-lnvgy)?\_dd_iscsi_([^_]+)_rhel6',
      type: 'dd',
      os: 'rhel6',
      osType: 'linux',
      proto: 'iscsi',
      inputDesc: 'Emulex iSCSI (be2iscsi) Device Driver for RHEL6 - ##VERSION## - Release ##RELEASE##',
      ddFileName: ['be2iscsi.ko'],
      ddVerFormat: '##VERSION##',
      appDevIdCfgName: 'Linux iSCSI DD',
      dudImageFileSearch: 'elx\-be2iscsi_([0-9\.]+)\-rhel6u([0-9])\-(i386|x86_64)\-[0-9]+\.iso',
      dudImageFileVersion: '$1',
      dudImageFileSP: '$2',
      dudImageFileArch: '$3',
    },
    ddRHEL6FC: {
      name: 'RHEL 6.x FC/FCoE Driver',
      regex: '^elx(?:\-lnvgy)?\_dd_fc_([^_]+)_rhel6',
      type: 'dd',
      os: 'rhel6',
      osType: 'linux',
      proto: 'fc',
      inputDesc: 'Emulex FC/FCoE (lpfc) Device Driver for RHEL6 - ##VERSION## - Release ##RELEASE##',
      ddFileName: ['lpfc.ko'],
      ddVerFormat: '0:##VERSION##',
      appDevIdCfgName: 'Linux FC/FCoE DD',
      dudImageFileSearch: 'elx\-lpfc_([0-9\.]+)\-rhel6u([0-9])\-(i386|x86_64)\-[0-9]+\.iso',
      dudImageFileVersion: '$1',
      dudImageFileSP: '$2',
      dudImageFileArch: '$3',
    },
    ddRHEL7NIC: {
      name: 'RHEL 7.x NIC Driver',
      regex: '^elx(?:\-lnvgy)?\_dd_nic_([^_]+)_rhel7',
      type: 'dd',
      os: 'rhel7',
      osType: 'linux',
      proto: 'nic',
      inputDesc: 'Emulex NIC (be2net) Device Driver for RHEL7 - ##VERSION## - Release ##RELEASE##',
      ddFileName: ['be2net.ko'],
      ddVerFormat: '##VERSION##',
      appDevIdCfgName: 'Linux NIC DD',
      dudImageFileSearch: 'elx\-be2net_([0-9\.]+)\-rhel7u([0-9])\-(i386|x86_64)\-[0-9]+\.iso',
      dudImageFileVersion: '$1',
      dudImageFileSP: '$2',
      dudImageFileArch: '$3',
      ocmImageFileSearch: [
        'elxocmcore\-([0-9\.]+)\-([0-9]+)\.(i386|x86_64)\.rpm',
        'elxocmcorelibs\-([0-9\.]+)\-([0-9]+)\.(i386|x86_64)\.rpm',
        'elxocmlibhbaapi(?:\-32bit)?\-([0-9\.]+)\-([0-9]+)\.(i386|x86_64)\.rpm'
      ],
      ocmImageFileVersion: '$1',
      ocmImageFileArch: '$3'
    },
    ddRHEL7ISCSI: {
      name: 'RHEL 7.x iSCSI Driver',
      regex: '^elx(?:\-lnvgy)?\_dd_iscsi_([^_]+)_rhel7',
      type: 'dd',
      os: 'rhel7',
      osType: 'linux',
      proto: 'iscsi',
      inputDesc: 'Emulex iSCSI (be2iscsi) Device Driver for RHEL7 - ##VERSION## - Release ##RELEASE##',
      ddFileName: ['be2iscsi.ko'],
      ddVerFormat: '##VERSION##',
      appDevIdCfgName: 'Linux iSCSI DD',
      dudImageFileSearch: 'elx\-be2iscsi_([0-9\.]+)\-rhel7u([0-9])\-(i386|x86_64)\-[0-9]+\.iso',
      dudImageFileVersion: '$1',
      dudImageFileSP: '$2',
      dudImageFileArch: '$3',
    },
    ddRHEL7FC: {
      name: 'RHEL 7.x FC/FCoE Driver',
      regex: '^elx(?:\-lnvgy)?\_dd_fc_([^_]+)_rhel7',
      type: 'dd',
      os: 'rhel7',
      osType: 'linux',
      proto: 'fc',
      inputDesc: 'Emulex FC/FCoE (lpfc) Device Driver for RHEL7 - ##VERSION## - Release ##RELEASE##',
      ddFileName: ['lpfc.ko'],
      ddVerFormat: '0:##VERSION##',
      appDevIdCfgName: 'Linux FC/FCoE DD',
      dudImageFileSearch: 'elx\-lpfc_([0-9\.]+)\-rhel7u([0-9])\-(i386|x86_64)\-[0-9]+\.iso',
      dudImageFileVersion: '$1',
      dudImageFileSP: '$2',
      dudImageFileArch: '$3',
    },
    ddSLES10NIC: {
      name: 'SLES 10.x NIC Driver',
      regex: '^elx(?:\-lnvgy)?\_dd_nic_([^_]+)_sles10',
      type: 'dd',
      os: 'sles10',
      osType: 'linux',
      proto: 'nic',
      inputDesc: 'Emulex NIC (be2net) Device Driver for SLES10 - ##VERSION## - Release ##RELEASE##',
      ddFileName: ['be2net.ko'],
      ddVerFormat: '##VERSION##',
      appDevIdCfgName: 'Linux NIC DD',
      dudImageFileSearch: 'elx\-be2net_([0-9\.]+)\-sles10sp([0-9])\-(i386|x86_64)\-[0-9]+\.iso',
      dudImageFileVersion: '$1',
      dudImageFileSP: '$2',
      dudImageFileArch: '$3',
      ocmImageFileSearch: [
        'elxocmcore\-([0-9\.]+)\-([0-9]+)\.(i386|x86_64)\.rpm',
        'elxocmcorelibs\-([0-9\.]+)\-([0-9]+)\.(i386|x86_64)\.rpm',
        'elxocmlibhbaapi(?:\-32bit)?\-([0-9\.]+)\-([0-9]+)\.(i386|x86_64)\.rpm'
      ],
      ocmImageFileVersion: '$1',
      ocmImageFileArch: '$3'
    },
    ddSLES10ISCSI: {
      name: 'SLES 10.x iSCSI Driver',
      regex: '^elx(?:\-lnvgy)?\_dd_iscsi_([^_]+)_sles10',
      type: 'dd',
      os: 'sles10',
      osType: 'linux',
      proto: 'iscsi',
      inputDesc: 'Emulex iSCSI (be2iscsi) Device Driver for SLES10 - ##VERSION## - Release ##RELEASE##',
      ddFileName: ['be2iscsi.ko'],
      ddVerFormat: '##VERSION##',
      appDevIdCfgName: 'Linux iSCSI DD',
      dudImageFileSearch: 'elx\-be2iscsi_([0-9\.]+)\-sles10sp([0-9])\-(i386|x86_64)\-[0-9]+\.iso',
      dudImageFileVersion: '$1',
      dudImageFileSP: '$2',
      dudImageFileArch: '$3',
    },
    ddSLES10FC: {
      name: 'SLES 10.x FC/FCoE Driver',
      regex: '^elx(?:\-lnvgy)?\_dd_fc_([^_]+)_sles10',
      type: 'dd',
      os: 'sles10',
      osType: 'linux',
      proto: 'fc',
      inputDesc: 'Emulex FC/FCoE (lpfc) Device Driver for SLES10 - ##VERSION## - Release ##RELEASE##',
      ddFileName: ['lpfc.ko'],
      ddVerFormat: '0:##VERSION##',
      appDevIdCfgName: 'Linux FC/FCoE DD',
      dudImageFileSearch: 'elx\-lpfc_([0-9\.]+)\-sles10sp([0-9])\-(i386|x86_64)\-[0-9]+\.iso',
      dudImageFileVersion: '$1',
      dudImageFileSP: '$2',
      dudImageFileArch: '$3',
    },
    ddSLES11NIC: {
      name: 'SLES 11.x NIC Driver',
      regex: '^elx(?:\-lnvgy)?\_dd_nic_([^_]+)_sles11',
      type: 'dd',
      os: 'sles11',
      osType: 'linux',
      proto: 'nic',
      inputDesc: 'Emulex NIC (be2net) Device Driver for SLES11 - ##VERSION## - Release ##RELEASE##',
      ddFileName: ['be2net.ko'],
      ddVerFormat: '##VERSION##',
      appDevIdCfgName: 'Linux NIC DD',
      dudImageFileSearch: 'elx\-be2net_([0-9\.]+)\-sles11sp([0-9])\-(i386|x86_64)\-[0-9]+\.iso',
      dudImageFileVersion: '$1',
      dudImageFileSP: '$2',
      dudImageFileArch: '$3',
      ocmImageFileSearch: [
        'elxocmcore\-([0-9\.]+)\-([0-9]+)\.(i386|x86_64)\.rpm',
        'elxocmcorelibs\-([0-9\.]+)\-([0-9]+)\.(i386|x86_64)\.rpm',
        'elxocmlibhbaapi(?:\-32bit)?\-([0-9\.]+)\-([0-9]+)\.(i386|x86_64)\.rpm'
      ],
      ocmImageFileVersion: '$1',
      ocmImageFileArch: '$3'
    },
    ddSLES11ISCSI: {
      name: 'SLES 11.x iSCSI Driver',
      regex: '^elx(?:\-lnvgy)?\_dd_iscsi_([^_]+)_sles11',
      type: 'dd',
      os: 'sles11',
      osType: 'linux',
      proto: 'iscsi',
      inputDesc: 'Emulex iSCSI (be2iscsi) Device Driver for SLES11 - ##VERSION## - Release ##RELEASE##',
      ddFileName: ['be2iscsi.ko'],
      ddVerFormat: '##VERSION##',
      appDevIdCfgName: 'Linux iSCSI DD',
      dudImageFileSearch: 'elx\-be2iscsi_([0-9\.]+)\-sles11sp([0-9])\-(i386|x86_64)\-[0-9]+\.iso',
      dudImageFileVersion: '$1',
      dudImageFileSP: '$2',
      dudImageFileArch: '$3',
    },
    ddSLES11FC: {
      name: 'SLES 11.x FC/FCoE Driver',
      regex: '^elx(?:\-lnvgy)?\_dd_fc_([^_]+)_sles11',
      type: 'dd',
      os: 'sles11',
      osType: 'linux',
      proto: 'fc',
      inputDesc: 'Emulex FC/FCoE (lpfc) Device Driver for SLES11 - ##VERSION## - Release ##RELEASE##',
      ddFileName: ['lpfc.ko'],
      ddVerFormat: '0:##VERSION##',
      appDevIdCfgName: 'Linux FC/FCoE DD',
      dudImageFileSearch: 'elx\-lpfc_([0-9\.]+)\-sles11sp([0-9])\-(i386|x86_64)\-[0-9]+\.iso',
      dudImageFileVersion: '$1',
      dudImageFileSP: '$2',
      dudImageFileArch: '$3',
    },
    ddSLES12NIC: {
      name: 'SLES 12.x NIC Driver',
      regex: '^elx(?:\-lnvgy)?\_dd_nic_([^_]+)_sles12',
      type: 'dd',
      os: 'sles12',
      osType: 'linux',
      proto: 'nic',
      inputDesc: 'Emulex NIC (be2net) Device Driver for SLES12 - ##VERSION## - Release ##RELEASE##',
      ddFileName: ['be2net.ko'],
      ddVerFormat: '##VERSION##',
      appDevIdCfgName: 'Linux NIC DD',
      dudImageFileSearch: 'elx\-be2net_([0-9\.]+)\-sles12sp([0-9])\-(i386|x86_64)\-[0-9]+\.iso',
      dudImageFileVersion: '$1',
      dudImageFileSP: '$2',
      dudImageFileArch: '$3',
      ocmImageFileSearch: [
        'elxocmcore\-([0-9\.]+)\-([0-9]+)\.(i386|x86_64)\.rpm',
        'elxocmcorelibs\-([0-9\.]+)\-([0-9]+)\.(i386|x86_64)\.rpm',
        'elxocmlibhbaapi(?:\-32bit)?\-([0-9\.]+)\-([0-9]+)\.(i386|x86_64)\.rpm'
      ],
      ocmImageFileVersion: '$1',
      ocmImageFileArch: '$3'
    },
    ddSLES12ISCSI: {
      name: 'SLES 12.x iSCSI Driver',
      regex: '^elx(?:\-lnvgy)?\_dd_iscsi_([^_]+)_sles12',
      type: 'dd',
      os: 'sles12',
      osType: 'linux',
      proto: 'iscsi',
      inputDesc: 'Emulex iSCSI (be2iscsi) Device Driver for SLES12 - ##VERSION## - Release ##RELEASE##',
      ddFileName: ['be2iscsi.ko'],
      ddVerFormat: '##VERSION##',
      appDevIdCfgName: 'Linux iSCSI DD',
      dudImageFileSearch: 'elx\-be2iscsi_([0-9\.]+)\-sles12sp([0-9])\-(i386|x86_64)\-[0-9]+\.iso',
      dudImageFileVersion: '$1',
      dudImageFileSP: '$2',
      dudImageFileArch: '$3',
    },
    ddSLES12FC: {
      name: 'SLES 12.x FC/FCoE Driver',
      regex: '^elx(?:\-lnvgy)?\_dd_fc_([^_]+)_sles12',
      type: 'dd',
      os: 'sles12',
      osType: 'linux',
      proto: 'fc',
      inputDesc: 'Emulex FC/FCoE (lpfc) Device Driver for SLES12 - ##VERSION## - Release ##RELEASE##',
      ddFileName: ['lpfc.ko'],
      ddVerFormat: '0:##VERSION##',
      appDevIdCfgName: 'Linux FC/FCoE DD',
      dudImageFileSearch: 'elx\-lpfc_([0-9\.]+)\-sles12sp([0-9])\-(i386|x86_64)\-[0-9]+\.iso',
      dudImageFileVersion: '$1',
      dudImageFileSP: '$2',
      dudImageFileArch: '$3',
    },
    fwBE3Linux: {
      name: 'Linux BE Firmware',
      regex: '^elx(?:\-lnvgy)?\_fw_cna_([A-Za-z0-9]+\-oc11\-[0-9\.]+\-[0-9]+)_linux',
      type: 'fw',
      os: 'linux',
      osType: 'linux',
      asic: 'BE3',
      preVersion: 'oc11-',
      inputDesc: 'Emulex OCe11xxx UCNA Firmware Update for Linux - ##VERSION## - Release ##RELEASE##',
      appDevIdCfgName: 'BE FW',
      fwImageFileSearch: 'oc11-([0-9\.]+)\.ufi',
      fwImageFileReplace: '$1'
    },
    fwBE3VMware: {
      name: 'VMware BE Firmware',
      regex: '^elx(?:\-lnvgy)?\_fw_cna_([A-Za-z0-9]+\-oc11\-[0-9\.]+\-[0-9]+)_vmware',
      type: 'fw',
      os: 'vmware',
      osType: 'vmware',
      asic: 'BE3',
      preVersion: 'oc11-',
      inputDesc: 'Emulex OCe11xxx UCNA Firmware Update for VMware - ##VERSION## - Release ##RELEASE##',
      appDevIdCfgName: 'BE FW',
      fwImageFileSearch: 'oc11-([0-9\.]+)\.ufi',
      fwImageFileReplace: '$1'
    },
    fwBE3Windows: {
      name: 'Windows BE Firmware',
      regex: '^elx(?:\-lnvgy)?\_fw_cna_([A-Za-z0-9]+\-oc11\-[0-9\.]+\-[0-9]+)_windows',
      type: 'fw',
      os: 'windows',
      osType: 'windows',
      asic: 'BE3',
      preVersion: 'oc11-',
      inputDesc: 'Emulex OCe11xxx UCNA Firmware Update for Windows - ##VERSION## - Release ##RELEASE##',
      appDevIdCfgName: 'BE FW',
      fwImageFileSearch: 'oc11-([0-9\.]+)\.ufi',
      fwImageFileReplace: '$1'
    },
    fwLancerG6Linux: {
      name: 'Linux Lancer G6 Firmware',
      regex: '^elx(?:\-lnvgy)?\_fw_fc_([A-Za-z0-9]+\-lp3x\-[0-9\.]+\-[0-9]+)_linux',
      type: 'fw',
      os: 'linux',
      osType: 'linux',
      asic: 'Lancer G6',
      preVersion: 'lp3x-',
      inputDesc: 'Emulex HBA (LPe3100x) Firmware Update for Linux - ##VERSION## - Release ##RELEASE##',
      appDevIdCfgName: 'Lancer G6 FW',
      fwImageFileSearch: 'lancerg6_A([0-9\.]+)\.grp',
      fwImageFileReplace: '$1'
    },
    fwLancerG6VMware: {
      name: 'VMware Lancer G6 Firmware',
      regex: '^elx(?:\-lnvgy)?\_fw_fc_([A-Za-z0-9]+\-lp3x\-[0-9\.]+\-[0-9]+)_vmware',
      type: 'fw',
      os: 'vmware',
      osType: 'vmware',
      asic: 'Lancer G6',
      preVersion: 'lp3x-',
      inputDesc: 'Emulex HBA (LPe3100x) Firmware Update for VMware - ##VERSION## - Release ##RELEASE##',
      appDevIdCfgName: 'Lancer G6 FW',
      fwImageFileSearch: 'lancerg6_A([0-9\.]+)\.grp',
      fwImageFileReplace: '$1'
    },
    fwLancerG6Windows: {
      name: 'Windows Lancer G6 Firmware',
      regex: '^elx(?:\-lnvgy)?\_fw_fc_([A-Za-z0-9]+\-lp3x\-[0-9\.]+\-[0-9]+)_windows',
      type: 'fw',
      os: 'windows',
      osType: 'windows',
      asic: 'Lancer G6',
      preVersion: 'lp3x-',
      inputDesc: 'Emulex HBA (LPe3100x) Firmware Update for Windows - ##VERSION## - Release ##RELEASE##',
      appDevIdCfgName: 'Lancer G6 FW',
      fwImageFileSearch: 'lancerg6_A([0-9\.]+)\.grp',
      fwImageFileReplace: '$1'
    },
    fwLancerG5Linux: {
      name: 'Linux Lancer G5 Firmware',
      regex: '^elx(?:\-lnvgy)?\_fw_fc_([A-Za-z0-9]+\-lp16\-[0-9\.]+\-[0-9]+)_linux',
      type: 'fw',
      os: 'linux',
      osType: 'linux',
      asic: 'Lancer G5',
      preVersion: 'lp16-',
      inputDesc: 'Emulex HBA (LPe1600x) Firmware Update for Linux - ##VERSION## - Release ##RELEASE##',
      appDevIdCfgName: 'Lancer G5 FW',
      fwImageFileSearch: 'lancer_A([0-9\.]+)\.grp',
      fwImageFileReplace: '$1'
    },
    fwLancerG5VMware: {
      name: 'VMware Lancer G5 Firmware',
      regex: '^elx(?:\-lnvgy)?\_fw_fc_([A-Za-z0-9]+\-lp16\-[0-9\.]+\-[0-9]+)_vmware',
      type: 'fw',
      os: 'vmware',
      osType: 'vmware',
      asic: 'Lancer G5',
      preVersion: 'lp16-',
      inputDesc: 'Emulex HBA (LPe1600x) Firmware Update for VMware - ##VERSION## - Release ##RELEASE##',
      appDevIdCfgName: 'Lancer G5 FW',
      fwImageFileSearch: 'lancer_A([0-9\.]+)\.grp',
      fwImageFileReplace: '$1'
    },
    fwLancerG5Windows: {
      name: 'Windows Lancer G5 Firmware',
      regex: '^elx(?:\-lnvgy)?\_fw_fc_([A-Za-z0-9]+\-lp16\-[0-9\.]+\-[0-9]+)_windows',
      type: 'fw',
      os: 'windows',
      osType: 'windows',
      asic: 'Lancer G5',
      preVersion: 'lp16-',
      inputDesc: 'Emulex HBA (LPe1600x) Firmware Update for Windows - ##VERSION## - Release ##RELEASE##',
      appDevIdCfgName: 'Lancer G5 FW',
      fwImageFileSearch: 'lancer_A([0-9\.]+)\.grp',
      fwImageFileReplace: '$1'
    },
    fwSaturnLinux: {
      name: 'Linux Saturn Firmware',
      regex: '^elx(?:\-lnvgy)?\_fw_fc_([A-Za-z0-9]+\-[0-9\.]+[xa][0-9]+\-[0-9]+)_linux',
      type: 'fw',
      os: 'linux',
      osType: 'linux',
      asic: 'Saturn',
      bootRegex: '([0-9\.]+[xa][0-9]+)',
      inputDesc: 'Emulex HBA (LPe1205/LPe1200x) Firmware Update for Linux - ##VERSION## - Release ##RELEASE##',
      appDevIdCfgName: 'Saturn FW',
      fwImageFileSearch: '(u[df])([0-9])([0-9][0-9])([xa])([0-9]+)\.all',
      fwImageFileReplace: '$2.$3$4$5',
      bootImageFileSearch: 'UU([0-9])([0-9][0-9])([xa])([0-9]+)\.prg',
      bootImageFileReplace: '$1.$2$3$4',
      fwImageFileNames: {
        rack: 'ud',
        flex: 'uf',
        bladecenter: 'uf'
      },
      bootImageNames: {
        rack: 'UU',
        flex: 'UU',
        bladecenter: 'UU'
      }
    },
    fwSaturnVMware: {
      name: 'VMware Saturn Firmware',
      regex: '^elx(?:\-lnvgy)?\_fw_fc_([A-Za-z0-9]+\-[0-9\.]+[xa][0-9]+\-[0-9]+)_vmware',
      type: 'fw',
      os: 'vmware',
      osType: 'vmware',
      asic: 'Saturn',
      bootRegex: '([0-9\.]+[xa][0-9]+)',
      inputDesc: 'Emulex HBA (LPe1205/LPe1200x) Firmware Update for VMware - ##VERSION## - Release ##RELEASE##',
      appDevIdCfgName: 'Saturn FW',
      fwImageFileSearch: '(u[df])([0-9])([0-9][0-9])([xa])([0-9]+)\.all',
      fwImageFileReplace: '$2.$3$4$5',
      bootImageFileSearch: 'UU([0-9])([0-9][0-9])([xa])([0-9]+)\.prg',
      bootImageFileReplace: '$1.$2$3$4',
      fwImageFileNames: {
        rack: 'ud',
        flex: 'uf',
        bladecenter: 'uf'
      },
      bootImageNames: {
        rack: 'UU',
        flex: 'UU',
        bladecenter: 'UU'
      }
    },
    fwSaturnWindows: {
      name: 'Windows Saturn Firmware',
      regex: '^elx(?:\-lnvgy)?\_fw_fc_([A-Za-z0-9]+\-[0-9\.]+[xa][0-9]+\-[0-9]+)_windows',
      type: 'fw',
      os: 'windows',
      osType: 'windows',
      asic: 'Saturn',
      bootRegex: '([0-9\.]+[xa][0-9]+)',
      inputDesc: 'Emulex HBA (LPe1205/LPe1200x) Firmware Update for Windows - ##VERSION## - Release ##RELEASE##',
      appDevIdCfgName: 'Saturn FW',
      fwImageFileSearch: '(u[df])([0-9])([0-9][0-9])([xa])([0-9]+)\.all',
      fwImageFileReplace: '$2.$3$4$5',
      bootImageFileSearch: 'UU([0-9])([0-9][0-9])([xa])([0-9]+)\.prg',
      bootImageFileReplace: '$1.$2$3$4',
      fwImageFileNames: {
        rack: 'ud',
        flex: 'uf',
        bladecenter: 'uf'
      },
      bootImageNames: {
        rack: 'UU',
        flex: 'UU',
        bladecenter: 'UU'
      }
    },
    fwSkyhawkLinux: {
      name: 'Linux Skyhawk Firmware',
      regex: '^elx(?:\-lnvgy)?\_fw_cna_([A-Za-z0-9]+\-oc14\-[0-9\.]+\-[0-9]+)_linux',
      type: 'fw',
      os: 'linux',
      osType: 'linux',
      asic: 'Skyhawk',
      preVersion: 'oc14-',
      inputDesc: 'Emulex OCe14xxx UCNA Firmware Update for Linux - ##VERSION## - Release ##RELEASE##',
      appDevIdCfgName: 'Skyhawk FW',
      fwImageFileSearch: 'oc14-([0-9\.]+)\.ufi',
      fwImageFileReplace: '$1'
    },
    fwSkyhawkVMware: {
      name: 'VMware Skyhawk Firmware',
      regex: '^elx(?:\-lnvgy)?\_fw_cna_([A-Za-z0-9]+\-oc14\-[0-9\.]+\-[0-9]+)_vmware',
      type: 'fw',
      os: 'vmware',
      osType: 'vmware',
      asic: 'Skyhawk',
      preVersion: 'oc14-',
      inputDesc: 'Emulex OCe14xxx UCNA Firmware Update for VMware - ##VERSION## - Release ##RELEASE##',
      appDevIdCfgName: 'Skyhawk FW',
      fwImageFileSearch: 'oc14-([0-9\.]+)\.ufi',
      fwImageFileReplace: '$1'
    },
    fwSkyhawkWindows: {
      name: 'Windows Skyhawk Firmware',
      regex: '^elx(?:\-lnvgy)?\_fw_cna_([A-Za-z0-9]+\-oc14\-[0-9\.]+\-[0-9]+)_windows',
      type: 'fw',
      os: 'windows',
      osType: 'windows',
      asic: 'Skyhawk',
      preVersion: 'oc14-',
      inputDesc: 'Emulex OCe14xxx UCNA Firmware Update for Windows - ##VERSION## - Release ##RELEASE##',
      appDevIdCfgName: 'Skyhawk FW',
      fwImageFileSearch: 'oc14-([0-9\.]+)\.ufi',
      fwImageFileReplace: '$1'
    },
  },

  // Classification mapping
  classMap: {
    10: 'firmware',   // Firmware only
    13: '13',         // Combined FW and Boot Code
    32773: 'bios'     // Boot Code (BIOS)
  },

  // All header search strings used to find relevant sections
  headerStr: {
    relName: 'release: ',
    relType: 'type: ',
    osList: 'operating systems',
    systemList: 'machine types',
    systemTypes: ['rack', 'flex', 'bladecenter'], // must match names in asicTypes.fwCfgNames & asicTypes.fwCfgNames
    adapterList: 'adapter models',
  }

};