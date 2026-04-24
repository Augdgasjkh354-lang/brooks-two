// Centralized game constants (Phase 8B)

// Population
export const INITIAL_POPULATION = 5000;
export const INITIAL_LABOR_FORCE = 3000;
export const INITIAL_CHILDREN = 1000;
export const INITIAL_ELDERLY = 1000;
export const BASE_GROWTH_RATE = 0.02;
export const MIN_GROWTH_RATE = -0.05;
export const MAX_GROWTH_RATE = 0.05;
export const LABOR_RATIO = 0.6;
export const CHILDREN_RATIO = 0.2;
export const ELDERLY_RATIO = 0.2;

// Agriculture
export const INITIAL_FARMLAND_MU = 30000;
export const BASE_GRAIN_YIELD_PER_MU = 500;
export const MAX_GRAIN_YIELD_PER_MU = 800;
export const LABOR_PER_MU = 10;
export const GRAIN_CONSUMPTION_PER_PERSON_PER_YEAR = 360;
export const GRAIN_CONSUMPTION_PER_PERSON = GRAIN_CONSUMPTION_PER_PERSON_PER_YEAR;
export const GRAIN_COMFORT_RESERVE = GRAIN_CONSUMPTION_PER_PERSON_PER_YEAR * 2;
export const FARMLAND_RECLAIM_COST_PER_MU = 500;
export const HEMP_RECLAIM_COST_PER_MU = 800;
export const MULBERRY_RECLAIM_COST_PER_MU = 1500;
export const MULBERRY_MATURATION_YEARS = 2;
export const MIN_RECLAIM_MU = 1000;
export const MIN_FIBER_RECLAIM_MU = 100;

// Market
export const SALT_BASE_PRICE = 4.0;
export const CLOTH_BASE_PRICE = 2.0;
export const SALT_CONSUMPTION_PER_PERSON = 15;
export const CLOTH_CONSUMPTION_PER_PERSON = 0.3;
export const SALT_PRICE_MIN = 1.0;
export const SALT_PRICE_MAX = 10.0;
export const CLOTH_PRICE_MIN = 0.8;
export const CLOTH_PRICE_MAX = 5.0;

// Commerce
export const SHOP_COST = 1500000;
export const SHOP_GDP_PER_UNIT = 500;
export const SHOP_LABOR_PER_UNIT = 5;
export const MERCHANT_POP_INIT_LITERACY = 0.25;
export const MONEYLENDER_LICENSE_FEE = 5000000;
export const MONEYLENDER_DEFAULT_TAX = 0.01;

// Currency
export const COUPON_GRAIN_RATIO = 1.0;
export const INFLATION_THRESHOLD_LOW = 0.7;
export const INFLATION_THRESHOLD_MID = 0.4;
export const INFLATION_RATE_LOW = 0.05;
export const INFLATION_RATE_MID = 0.15;
export const INFLATION_RATE_HIGH = 0.30;

// Society
export const BASE_STABILITY = 80;
export const STABILITY_MIN = 0;
export const STABILITY_MAX = 100;
export const BASE_LIFE_QUALITY = 50;
export const FARMER_INIT_LITERACY = 0.05;
export const OFFICIAL_INIT_LITERACY = 0.5;
export const WORKER_INIT_LITERACY = 0.08;
export const LANDLORD_INIT_LITERACY = 0.2;

// Institutions
export const POLICE_RATIO_CRITICAL = 0.001;
export const POLICE_RATIO_LOW = 0.002;
export const POLICE_RATIO_GOOD = 0.005;
export const POLICE_RATIO_HIGH = 0.01;
export const PUBLIC_TOILET_COST = 50000;
export const ROAD_COST_PER_LI = 10000;
export const PEOPLE_PER_TOILET = 100;
export const HEALTH_BUREAU_TOILET_MIN = 50;
export const HEALTH_BUREAU_SANITATION_MIN = 5;
export const HEALTH_BUREAU_CLEANING_MIN = 5;

// Diplomacy (Xikou)
export const XIKOU_INIT_POPULATION = 3000;
export const XIKOU_INIT_LABOR = 1800;
export const XIKOU_FARMLAND_MU = 3000;
export const XIKOU_SALT_OUTPUT = 200000;
export const XIKOU_MULBERRY_MU = 1200;
export const XIKOU_HEMP_MU = 800;
export const ENVOY_COST = 500000;
export const SALT_TRADE_RATIO = 0.5;
export const CLOTH_TRADE_RATIO = 0.3;

// Education
export const PRIMARY_PROGRAM_YEARS = 3;
export const SECONDARY_PROGRAM_YEARS = 4;
export const HIGHER_PROGRAM_YEARS = 3;
export const SCHOOL_LICENSE_FEE = 2000000;
export const HIGHER_SCHOOL_GRAD_MIN = 2000;
export const HIGHER_SCHOOL_YEAR_MIN = 100;
export const GRADUATE_DECAY_RATE = 0.97;
export const ELIGIBLE_POOL_DECAY = 0.95;

// Tech costs
export const TECH_BASIC_FARMING = 200000;
export const TECH_INTENSIVE_FARMING = 500000;
export const TECH_CROP_ROTATION = 800000;
export const TECH_IRRIGATION = 1000000;
export const TECH_FOLK_TRADE = 100000;
export const TECH_CONTRACT_LAW = 400000;
export const TECH_WEIGHTS_MEASURES = 300000;
export const TECH_WRITTEN_RECORDS = 300000;
export const TECH_PAPERMAKING = 500000;
export const TECH_CODIFIED_LAW = 400000;
export const TECH_HERBALISM = 200000;
export const TECH_BASIC_MEDICINE = 600000;
export const TECH_MILITIA = 300000;
export const TECH_WEAPON_FORGING = 500000;
export const TECH_SELECTIVE_BREEDING = 1200000;
export const TECH_WATERMILL = 1500000;
export const TECH_MONEYLENDER = 2000000;
export const TECH_LONG_DISTANCE_TRADE = 2500000;
export const TECH_IMPERIAL_EXAM = 3000000;
export const TECH_ADVANCED_MEDICINE = 2000000;
export const TECH_FORTIFICATION = 2500000;
export const TECH_INTELLIGENCE = 1500000;
