// ── Cyberware showcase (validado: typecheck + 5 sondas de fluxo verdes) — TreeDef completo (ripperdoc / action-RPG) ──
//
// Exercita a metade do motor que Oberón non toca:
//   • cost (€$ + Components + Capacity)   • exclusions (OS slot, Arm slot)
//   • statContributions (deltas pasivos)  • costPerTier (Mk.I→II→III)
//   • prerequisites + resource_min (Street Cred como gate de nivel)
//   • NodeShape 'hexagon'                  • layout fixo ancorado ao corpo
//
// Posicións en px-space (x 0..1200, y 0..820), ancoradas ao corpo.
// IdentityLayout (layout.type 'custom') cópiaas literais — render-verify (A.6.31).
// curve 'octilinear' (briefing 1 aterrado en @core).
//
// NOTA (A.6.38): os deltas de stats pasan por `statContributions`, NON
// por `effects: [{ type: 'modify_stat', ... }]`. modify_stat existe na
// unión Effect pero non está implementado en runtime; unlock fai
// rollback con YGG_E017 se se usa.

import type { TreeDef } from '@yggdrasil-forge/core'

export const cyberwareTree: TreeDef = {
  id: 'cyberware-ripperdoc',
  schemaVersion: '1.0.0',
  version: '0.1.0',
  label: { en: 'Cyberware', es: 'Ciberware', gl: 'Ciberware' },
  description: {
    en: 'Augmentation matrix — install ciberware across body systems.',
  },
  author: 'Yggdrasil Forge',
  rootNodeId: 'neural_hub',
  theme: 'chrome',

  // ── Recursos da economía ──
  resources: [
    {
      id: 'eurodollars',
      label: { en: 'Eurodollars' },
      icon: '€$',
      color: '#f0a830',
      initial: 245760,
    },
    { id: 'components', label: { en: 'Components' }, icon: 'comp', color: '#7fd4d8', initial: 235 },
    {
      id: 'capacity',
      label: { en: 'Capacity' },
      icon: 'cap',
      color: '#1ad0e0',
      initial: 24,
      max: 24,
    },
    {
      id: 'street_cred',
      label: { en: 'Street Cred' },
      icon: 'cred',
      color: '#9ad06a',
      initial: 27,
    },
  ],
  startingBudget: {
    resources: { eurodollars: 245760, components: 235, capacity: 24, street_cred: 27 },
  },

  // ── Stats que os implantes modifican ──
  stats: [
    { id: 'reflex', label: { en: 'Reflex' }, initial: 0, format: 'percent' },
    { id: 'crit_chance', label: { en: 'Critical Chance' }, initial: 5, format: 'percent' },
    { id: 'attack_speed', label: { en: 'Attack Speed' }, initial: 0, format: 'percent' },
    { id: 'armor', label: { en: 'Armor' }, initial: 0, format: 'number' },
    { id: 'health', label: { en: 'Health' }, initial: 100, format: 'number' },
    { id: 'melee', label: { en: 'Melee Damage' }, initial: 0, format: 'number' },
    { id: 'hacking', label: { en: 'Hacking' }, initial: 0, format: 'number' },
    { id: 'stealth', label: { en: 'Stealth' }, initial: 0, format: 'number' },
  ],

  // ── Sistemas corporais (grupos) ──
  groups: [
    { id: 'frontal_cortex', label: { en: 'Frontal Cortex' }, color: '#a06ad0', icon: 'brain' },
    { id: 'ocular_system', label: { en: 'Ocular System' }, color: '#5ec8e0', icon: 'eye' },
    { id: 'nervous_system', label: { en: 'Nervous System' }, color: '#1ad0e0', icon: 'nerve' },
    {
      id: 'circulatory_system',
      label: { en: 'Circulatory System' },
      color: '#e0686a',
      icon: 'heart',
    },
    {
      id: 'integumentary_system',
      label: { en: 'Integumentary System' },
      color: '#6ad0a0',
      icon: 'skin',
    },
    { id: 'skeletal_system', label: { en: 'Skeletal System' }, color: '#7fb0d8', icon: 'bone' },
    { id: 'muscular_system', label: { en: 'Muscular System' }, color: '#f0a830', icon: 'muscle' },
  ],

  layout: { type: 'custom', curve: 'octilinear' },

  // ── Nodos (implantes) ──
  nodes: [
    // Hub central (raíz, gratuíto)
    {
      id: 'neural_hub',
      type: 'root',
      shape: 'hexagon',
      label: { en: 'Neural Link' },
      description: { en: 'The cortical port that makes you compatible with ciberware.' },
      content: { flavor: { en: 'Everything starts here. Welcome to the new flesh.' } },
      icon: 'crown',
      color: '#1ad0e0',
      group: 'nervous_system',
      position: { x: 600, y: 344 },
      maxTier: 1,
    },

    // ── Frontal Cortex (neuralware / hacking) ──
    {
      id: 'cyberdeck',
      type: 'keystone',
      shape: 'hexagon',
      label: { en: 'Cyberdeck' },
      description: { en: 'A quickhacking platform wired into your cortex.' },
      content: { flavor: { en: 'The deck is the difference between a netrunner and a corpse.' } },
      group: 'frontal_cortex',
      position: { x: 360, y: 98 },
      maxTier: 1,
      cost: [
        { resourceId: 'eurodollars', amount: 18000 },
        { resourceId: 'components', amount: 10 },
        { resourceId: 'capacity', amount: 3 },
      ],
      statContributions: [{ statId: 'hacking', op: '+', value: 15 }],
      prerequisites: { type: 'node_unlocked', nodeId: 'neural_hub' },
    },
    {
      id: 'ram_upgrade',
      type: 'small',
      shape: 'hexagon',
      label: { en: 'RAM Upgrade' },
      description: { en: 'Extra memory for holding more quickhacks in buffer.' },
      group: 'frontal_cortex',
      position: { x: 228, y: 148 },
      maxTier: 3,
      costPerTier: [
        [
          { resourceId: 'eurodollars', amount: 3000 },
          { resourceId: 'capacity', amount: 1 },
        ],
        [
          { resourceId: 'eurodollars', amount: 6000 },
          { resourceId: 'components', amount: 4 },
          { resourceId: 'capacity', amount: 1 },
        ],
        [
          { resourceId: 'eurodollars', amount: 12000 },
          { resourceId: 'components', amount: 8 },
          { resourceId: 'capacity', amount: 1 },
        ],
      ],
      tiers: [
        { label: { en: 'Mk.I' }, description: { en: '+1 RAM slot.' } },
        { label: { en: 'Mk.II' }, description: { en: '+2 RAM slots, faster recovery.' } },
        { label: { en: 'Mk.III' }, description: { en: '+3 RAM slots, instant recovery on kill.' } },
      ],
      statContributions: [{ statId: 'hacking', op: '+', value: 5 }],
      prerequisites: { type: 'node_unlocked', nodeId: 'cyberdeck' },
    },
    {
      id: 'icebreaker',
      type: 'notable',
      shape: 'hexagon',
      label: { en: 'Icebreaker' },
      description: { en: 'Daemon that shreds enemy ICE before it can trace you.' },
      group: 'frontal_cortex',
      position: { x: 360, y: 197 },
      maxTier: 1,
      cost: [
        { resourceId: 'eurodollars', amount: 28000 },
        { resourceId: 'components', amount: 16 },
        { resourceId: 'capacity', amount: 4 },
      ],
      statContributions: [{ statId: 'hacking', op: '+', value: 25 }],
      prerequisites: {
        type: 'all',
        conditions: [
          { type: 'node_unlocked', nodeId: 'cyberdeck' },
          { type: 'resource_min', resourceId: 'street_cred', amount: 35 },
        ],
      },
    },

    // ── Ocular System (optics / targeting) ──
    {
      id: 'kiroshi_optics',
      type: 'notable',
      shape: 'hexagon',
      label: { en: 'Kiroshi Optics' },
      description: { en: 'Smart eyes with target tagging and threat overlay.' },
      content: { flavor: { en: 'You never look at the world the same way again.' } },
      group: 'ocular_system',
      position: { x: 792, y: 78 },
      maxTier: 1,
      cost: [
        { resourceId: 'eurodollars', amount: 12000 },
        { resourceId: 'components', amount: 6 },
        { resourceId: 'capacity', amount: 2 },
      ],
      statContributions: [{ statId: 'crit_chance', op: '+', value: 5 }],
      prerequisites: { type: 'node_unlocked', nodeId: 'neural_hub' },
    },
    {
      id: 'threat_detector',
      type: 'small',
      shape: 'hexagon',
      label: { en: 'Threat Detector' },
      description: { en: 'Highlights hostiles through walls within range.' },
      group: 'ocular_system',
      position: { x: 924, y: 156 },
      maxTier: 1,
      cost: [
        { resourceId: 'eurodollars', amount: 7000 },
        { resourceId: 'capacity', amount: 1 },
      ],
      statContributions: [{ statId: 'stealth', op: '+', value: 10 }],
      prerequisites: { type: 'node_unlocked', nodeId: 'kiroshi_optics' },
    },
    {
      id: 'trajectory_analysis',
      type: 'notable',
      shape: 'hexagon',
      label: { en: 'Trajectory Analysis' },
      description: { en: 'Predicts bullet paths; ricochets become trivial.' },
      group: 'ocular_system',
      position: { x: 936, y: 246 },
      maxTier: 1,
      cost: [
        { resourceId: 'eurodollars', amount: 22000 },
        { resourceId: 'components', amount: 12 },
        { resourceId: 'capacity', amount: 3 },
      ],
      statContributions: [{ statId: 'crit_chance', op: '+', value: 15 }],
      prerequisites: {
        type: 'all',
        conditions: [
          { type: 'node_unlocked', nodeId: 'kiroshi_optics' },
          { type: 'resource_min', resourceId: 'street_cred', amount: 25 },
        ],
      },
    },

    // ── Nervous System — OS SLOT (exclusións mutuas) ──
    {
      id: 'synaptic_accelerator',
      type: 'notable',
      shape: 'hexagon',
      label: { en: 'Synaptic Accelerator' },
      description: { en: 'Boosts nerve conduction. Gateway to combat operating systems.' },
      group: 'nervous_system',
      position: { x: 600, y: 213 },
      maxTier: 1,
      cost: [
        { resourceId: 'eurodollars', amount: 14000 },
        { resourceId: 'components', amount: 8 },
        { resourceId: 'capacity', amount: 2 },
      ],
      statContributions: [{ statId: 'reflex', op: '+', value: 10 }],
      prerequisites: { type: 'node_unlocked', nodeId: 'neural_hub' },
    },
    {
      id: 'sandevistan',
      type: 'keystone',
      shape: 'hexagon',
      label: { en: 'Sandevistan' },
      description: {
        en: 'Militech "Apogee" Sandevistan. Slows time to a crawl, letting you move and react at superhuman speeds.',
      },
      content: { flavor: { en: 'Time is a luxury. The Sandy makes you rich.' } },
      group: 'nervous_system',
      position: { x: 744, y: 164 },
      maxTier: 3,
      costPerTier: [
        [
          { resourceId: 'eurodollars', amount: 15000 },
          { resourceId: 'components', amount: 8 },
          { resourceId: 'capacity', amount: 4 },
        ],
        [
          { resourceId: 'eurodollars', amount: 30000 },
          { resourceId: 'components', amount: 16 },
          { resourceId: 'capacity', amount: 2 },
        ],
        [
          { resourceId: 'eurodollars', amount: 60000 },
          { resourceId: 'components', amount: 28 },
          { resourceId: 'capacity', amount: 2 },
        ],
      ],
      tiers: [
        { label: { en: 'Mk.I' }, description: { en: 'Slows time to 50% for 4s.' } },
        { label: { en: 'Mk.II' }, description: { en: 'Slows time to 25% for 6s.' } },
        { label: { en: 'Mk.III' }, description: { en: 'Slows time to 10% for 8s.' } },
      ],
      statContributions: [
        { statId: 'reflex', op: '+', value: 40 },
        { statId: 'crit_chance', op: '+', value: 15 },
        { statId: 'attack_speed', op: '+', value: 20 },
      ],
      exclusions: ['kerenzikov', 'berserk'],
      prerequisites: {
        type: 'all',
        conditions: [
          { type: 'node_unlocked', nodeId: 'synaptic_accelerator' },
          { type: 'resource_min', resourceId: 'street_cred', amount: 30 },
        ],
      },
    },
    {
      id: 'kerenzikov',
      type: 'keystone',
      shape: 'hexagon',
      label: { en: 'Kerenzikov' },
      description: { en: 'Reflex booster that slows time while aiming during a dodge.' },
      group: 'nervous_system',
      position: { x: 840, y: 246 },
      maxTier: 1,
      cost: [
        { resourceId: 'eurodollars', amount: 18000 },
        { resourceId: 'components', amount: 10 },
        { resourceId: 'capacity', amount: 3 },
      ],
      statContributions: [
        { statId: 'reflex', op: '+', value: 25 },
        { statId: 'crit_chance', op: '+', value: 10 },
      ],
      exclusions: ['sandevistan', 'berserk'],
      prerequisites: { type: 'node_unlocked', nodeId: 'synaptic_accelerator' },
    },

    // ── Circulatory System (health / berserk) ──
    {
      id: 'biomonitor',
      type: 'small',
      shape: 'hexagon',
      label: { en: 'Biomonitor' },
      description: { en: 'Auto-injects a heal when health drops critically.' },
      group: 'circulatory_system',
      position: { x: 408, y: 279 },
      maxTier: 1,
      cost: [
        { resourceId: 'eurodollars', amount: 6000 },
        { resourceId: 'capacity', amount: 1 },
      ],
      statContributions: [{ statId: 'health', op: '+', value: 25 }],
      prerequisites: { type: 'node_unlocked', nodeId: 'neural_hub' },
    },
    {
      id: 'second_heart',
      type: 'notable',
      shape: 'hexagon',
      label: { en: 'Second Heart' },
      description: { en: 'On death, instantly restores full health. Once per fight.' },
      content: { flavor: { en: 'Death is just a hardware fault now.' } },
      group: 'circulatory_system',
      position: { x: 288, y: 328 },
      maxTier: 1,
      cost: [
        { resourceId: 'eurodollars', amount: 32000 },
        { resourceId: 'components', amount: 18 },
        { resourceId: 'capacity', amount: 5 },
      ],
      statContributions: [{ statId: 'health', op: '+', value: 50 }],
      prerequisites: {
        type: 'all',
        conditions: [
          { type: 'node_unlocked', nodeId: 'biomonitor' },
          { type: 'resource_min', resourceId: 'street_cred', amount: 40 },
        ],
      },
    },
    {
      id: 'berserk',
      type: 'keystone',
      shape: 'hexagon',
      label: { en: 'Berserk' },
      description: {
        en: 'Combat stim OS: boosts damage, armor and slows perceived time under fire.',
      },
      group: 'circulatory_system',
      position: { x: 480, y: 377 },
      maxTier: 1,
      cost: [
        { resourceId: 'eurodollars', amount: 20000 },
        { resourceId: 'components', amount: 12 },
        { resourceId: 'capacity', amount: 4 },
      ],
      statContributions: [
        { statId: 'melee', op: '+', value: 30 },
        { statId: 'armor', op: '+', value: 20 },
      ],
      exclusions: ['sandevistan', 'kerenzikov'],
      prerequisites: { type: 'node_unlocked', nodeId: 'biomonitor' },
    },

    // ── Integumentary System (skin / stealth) ──
    {
      id: 'bioconductor',
      type: 'small',
      shape: 'hexagon',
      label: { en: 'Bioconductor' },
      description: { en: 'Regulates implant heat; reduces cyberware cooldowns.' },
      group: 'integumentary_system',
      position: { x: 384, y: 426 },
      maxTier: 1,
      cost: [
        { resourceId: 'eurodollars', amount: 9000 },
        { resourceId: 'capacity', amount: 1 },
      ],
      statContributions: [{ statId: 'health', op: '+', value: 10 }],
      prerequisites: { type: 'node_unlocked', nodeId: 'neural_hub' },
    },
    {
      id: 'optical_camo',
      type: 'notable',
      shape: 'hexagon',
      label: { en: 'Optical Camo' },
      description: { en: 'Bends light around you. Brief active invisibility.' },
      group: 'integumentary_system',
      position: { x: 300, y: 476 },
      maxTier: 1,
      cost: [
        { resourceId: 'eurodollars', amount: 26000 },
        { resourceId: 'components', amount: 14 },
        { resourceId: 'capacity', amount: 3 },
      ],
      statContributions: [{ statId: 'stealth', op: '+', value: 40 }],
      prerequisites: {
        type: 'all',
        conditions: [
          { type: 'node_unlocked', nodeId: 'bioconductor' },
          { type: 'resource_min', resourceId: 'street_cred', amount: 35 },
        ],
      },
    },

    // ── Skeletal System (frame / armor) — cadea profunda ──
    {
      id: 'subdermal_plate',
      type: 'notable',
      shape: 'hexagon',
      label: { en: 'Subdermal Armor' },
      description: { en: 'Woven plating beneath the skin.' },
      group: 'skeletal_system',
      position: { x: 600, y: 459 },
      maxTier: 3,
      costPerTier: [
        [
          { resourceId: 'eurodollars', amount: 5000 },
          { resourceId: 'capacity', amount: 2 },
        ],
        [
          { resourceId: 'eurodollars', amount: 11000 },
          { resourceId: 'components', amount: 6 },
          { resourceId: 'capacity', amount: 1 },
        ],
        [
          { resourceId: 'eurodollars', amount: 22000 },
          { resourceId: 'components', amount: 12 },
          { resourceId: 'capacity', amount: 1 },
        ],
      ],
      tiers: [
        { label: { en: 'Mk.I' }, description: { en: '+15 Armor.' } },
        { label: { en: 'Mk.II' }, description: { en: '+35 Armor.' } },
        { label: { en: 'Mk.III' }, description: { en: '+60 Armor, damage reduction at low HP.' } },
      ],
      statContributions: [{ statId: 'armor', op: '+', value: 15 }],
      prerequisites: { type: 'node_unlocked', nodeId: 'neural_hub' },
    },
    {
      id: 'reinforced_skeleton',
      type: 'notable',
      shape: 'hexagon',
      label: { en: 'Reinforced Skeleton' },
      description: { en: 'Titanium-laced bones. More health, no fall damage.' },
      group: 'skeletal_system',
      position: { x: 600, y: 558 },
      maxTier: 1,
      cost: [
        { resourceId: 'eurodollars', amount: 16000 },
        { resourceId: 'components', amount: 10 },
        { resourceId: 'capacity', amount: 3 },
      ],
      statContributions: [
        { statId: 'health', op: '+', value: 40 },
        { statId: 'armor', op: '+', value: 10 },
      ],
      prerequisites: { type: 'node_unlocked', nodeId: 'subdermal_plate' },
    },
    {
      id: 'titanium_bones',
      type: 'mastery',
      shape: 'hexagon',
      label: { en: 'Titanium Bones' },
      description: { en: 'Full skeletal replacement. Carry capacity and melee force soar.' },
      content: { flavor: { en: 'You are more machine than meat now. Good.' } },
      group: 'skeletal_system',
      position: { x: 600, y: 656 },
      maxTier: 1,
      cost: [
        { resourceId: 'eurodollars', amount: 45000 },
        { resourceId: 'components', amount: 24 },
        { resourceId: 'capacity', amount: 5 },
      ],
      statContributions: [
        { statId: 'melee', op: '+', value: 25 },
        { statId: 'health', op: '+', value: 30 },
      ],
      prerequisites: {
        type: 'all',
        conditions: [
          { type: 'node_unlocked', nodeId: 'reinforced_skeleton' },
          { type: 'resource_min', resourceId: 'street_cred', amount: 45 },
        ],
      },
    },

    // ── Muscular System — ARM SLOT (exclusións mutuas) ──
    {
      id: 'gorilla_arms',
      type: 'keystone',
      shape: 'hexagon',
      label: { en: 'Gorilla Arms' },
      description: { en: 'Hydraulic fists. Rip doors off hinges and people in half.' },
      group: 'muscular_system',
      position: { x: 960, y: 361 },
      maxTier: 1,
      cost: [
        { resourceId: 'eurodollars', amount: 19000 },
        { resourceId: 'components', amount: 12 },
        { resourceId: 'capacity', amount: 3 },
      ],
      statContributions: [{ statId: 'melee', op: '+', value: 35 }],
      exclusions: ['mantis_blades', 'monowire'],
      prerequisites: { type: 'node_unlocked', nodeId: 'neural_hub' },
    },
    {
      id: 'mantis_blades',
      type: 'keystone',
      shape: 'hexagon',
      label: { en: 'Mantis Blades' },
      description: { en: 'Dermal-sheathed blades that extend from the forearm.' },
      content: { flavor: { en: 'Elegant. Lethal. Always with you.' } },
      group: 'muscular_system',
      position: { x: 864, y: 410 },
      maxTier: 1,
      cost: [
        { resourceId: 'eurodollars', amount: 20000 },
        { resourceId: 'components', amount: 12 },
        { resourceId: 'capacity', amount: 3 },
      ],
      statContributions: [
        { statId: 'melee', op: '+', value: 30 },
        { statId: 'crit_chance', op: '+', value: 10 },
      ],
      exclusions: ['gorilla_arms', 'monowire'],
      prerequisites: { type: 'node_unlocked', nodeId: 'neural_hub' },
    },
    {
      id: 'monowire',
      type: 'keystone',
      shape: 'hexagon',
      label: { en: 'Monowire' },
      description: { en: 'A monomolecular whip that doubles as a hacking conduit.' },
      group: 'muscular_system',
      position: { x: 936, y: 459 },
      maxTier: 1,
      cost: [
        { resourceId: 'eurodollars', amount: 21000 },
        { resourceId: 'components', amount: 13 },
        { resourceId: 'capacity', amount: 3 },
      ],
      statContributions: [
        { statId: 'melee', op: '+', value: 22 },
        { statId: 'hacking', op: '+', value: 12 },
      ],
      exclusions: ['mantis_blades', 'gorilla_arms'],
      prerequisites: { type: 'node_unlocked', nodeId: 'neural_hub' },
    },
  ],

  // ── Arestas (conexións visuais = espello dos prerrequisitos) ──
  edges: [
    { id: 'e1', source: 'neural_hub', target: 'cyberdeck', type: 'dependency' },
    { id: 'e2', source: 'cyberdeck', target: 'ram_upgrade', type: 'dependency' },
    { id: 'e3', source: 'cyberdeck', target: 'icebreaker', type: 'dependency' },
    { id: 'e4', source: 'neural_hub', target: 'kiroshi_optics', type: 'dependency' },
    { id: 'e5', source: 'kiroshi_optics', target: 'threat_detector', type: 'dependency' },
    { id: 'e6', source: 'kiroshi_optics', target: 'trajectory_analysis', type: 'dependency' },
    { id: 'e7', source: 'neural_hub', target: 'synaptic_accelerator', type: 'dependency' },
    { id: 'e8', source: 'synaptic_accelerator', target: 'sandevistan', type: 'dependency' },
    { id: 'e9', source: 'synaptic_accelerator', target: 'kerenzikov', type: 'dependency' },
    { id: 'e10', source: 'neural_hub', target: 'biomonitor', type: 'dependency' },
    { id: 'e11', source: 'biomonitor', target: 'second_heart', type: 'dependency' },
    { id: 'e12', source: 'biomonitor', target: 'berserk', type: 'dependency' },
    { id: 'e13', source: 'neural_hub', target: 'bioconductor', type: 'dependency' },
    { id: 'e14', source: 'bioconductor', target: 'optical_camo', type: 'dependency' },
    { id: 'e15', source: 'neural_hub', target: 'subdermal_plate', type: 'dependency' },
    { id: 'e16', source: 'subdermal_plate', target: 'reinforced_skeleton', type: 'dependency' },
    { id: 'e17', source: 'reinforced_skeleton', target: 'titanium_bones', type: 'dependency' },
    { id: 'e18', source: 'neural_hub', target: 'gorilla_arms', type: 'dependency' },
    { id: 'e19', source: 'neural_hub', target: 'mantis_blades', type: 'dependency' },
    { id: 'e20', source: 'neural_hub', target: 'monowire', type: 'dependency' },
  ],
}
