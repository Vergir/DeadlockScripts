const WIKI_URL               = WIKI_HERO_ATTRIBUTES_URL; // defined in scripts/shared.js
const SPIRIT_POWER_STAT_NAME = "TechPower";

const DROP_COLUMNS = new Set([
  "Bonus Attack Range (m)",
  "Sustained DPS",
]);

const LOWER_IS_BETTER = new Set([
  "Reload Time (s)",
  "Reload Delay (s)",
  "Time Between Bursted Bullets (s)",
  "Bullet Gravity Scale",
  "Spin Deceleration",
  "Stamina Cooldown (s)",
]);

const OUTLIER_STATS = new Set([
  "Bullets Per Shot",
  "Bullets Per Burst",
  "Time Between Bursted Bullets (s)",
  "Reload Single",
  "Reload Delay (s)",
  "Rounds Per Second At Max Spin",
  "Spin Acceleration",
  "Spin Deceleration",
]);

const OUTLIER_DISPLAY_ORDER = [
  "Bullets Per Shot",
  "Bullets Per Burst",
  "Time Between Bursted Bullets (s)",
  "Reload Single",
  "Reload Delay (s)",
  "Rounds Per Second At Max Spin",
  "Spin Acceleration",
  "Spin Deceleration",
];

// Weapon stats: everything before Max Health
const WEAPON_STATS = new Set([
  "DPS", "Bullet Damage", "Bullets per sec", "Fire Rate (%)",
  "Ammo", "Reload Time (s)", "Reload Delay (s)", "Bullets Per Shot", "Bullets Per Burst",
  "Time Between Bursted Bullets (s)", "Light Melee", "Heavy Melee", "Reload Single",
  "Bullet Velocity (m/s)", "Bullet Gravity Scale", "Falloff Start Range", "Falloff End Range",
  "Crit Bonus Scale", "Rounds Per Second At Max Spin", "Spin Acceleration", "Spin Deceleration",
]);

// Vitality stats: Max Health through Dash Speed
const VITALITY_STATS = new Set([
  "Max Health", "Health Regen", "Bullet Resist (%)", "Spirit Resist (%)", "Melee Resist (%)",
  "Bullet Lifesteal (%)", "Crit Reduction",
  "Move Speed (m/s)", "Sprint Speed (m)", "Stamina Cooldown (s)", "Stamina", "Dash Speed (m)",
]);

// Spirit stats: Spirit Power only
const SPIRIT_STATS = new Set([
  "Spirit Power",
]);

// HEADER_COLORS, COLOR_CMP_* and OUTLIER_BLUE live in scripts/shared.js
const ABBREVIATIONS = {
  "DPS":                                  "DPS",
  "Bullet Damage":                        "BD",
  "Bullets per sec":                      "SPS",
  "Fire Rate (%)":                        "FR",
  "Ammo":                                 "AMO",
  "Reload Time (s)":                      "RT",
  "Reload Delay (s)":                     "RD",
  "Bullets Per Shot":                     "BPSH",
  "Bullets Per Burst":                    "BPB",
  "Time Between Bursted Bullets (s)":     "TBB",
  "Light Melee":                          "LM",
  "Heavy Melee":                          "HM",
  "Reload Single":                        "RSB",
  "Bullet Velocity (m/s)":               "BV",
  "Bullet Gravity Scale":                 "BGS",
  "Falloff Start Range":                  "FSR",
  "Falloff End Range":                    "FER",
  "Crit Bonus Scale":                     "CBS",
  "Rounds Per Second At Max Spin":        "RPS",
  "Spin Acceleration":                    "SA",
  "Spin Deceleration":                    "SD",
  "Max Health":                           "HP",
  "Health Regen":                         "HR",
  "Bullet Resist (%)":                    "BR",
  "Spirit Resist (%)":                    "SR",
  "Melee Resist (%)":                     "MR",
  "Bullet Lifesteal (%)":                 "BLS",
  "Crit Reduction":                       "CR",
  "Move Speed (m/s)":                     "MS",
  "Sprint Speed (m)":                     "SS",
  "Stamina Cooldown (s)":                 "SCD",
  "Stamina":                              "STA",
  "Dash Speed (m)":                       "DS",
  "Spirit Power":                         "SP",
};

const DISPLAY_NAMES = {
  "Bullets per sec": "Shots per Second",
  "Reload Single":   "Reloads Single Bullet",
};
