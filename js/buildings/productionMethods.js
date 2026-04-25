export const PRODUCTION_METHODS = {
  manual_farming: { id: 'manual_farming', name: '人力耕作', outputMultiplier: 1, laborMultiplier: 1, inputMultiplier: 1 },
  improved_plow: { id: 'improved_plow', name: '改良犁耕', outputMultiplier: 1.08, laborMultiplier: 0.95, inputMultiplier: 1 },
  irrigated_farming: { id: 'irrigated_farming', name: '灌溉农法', outputMultiplier: 1.2, laborMultiplier: 1, inputMultiplier: 1.05 },

  manual_hemp: { id: 'manual_hemp', name: '人工种麻', outputMultiplier: 1, laborMultiplier: 1, inputMultiplier: 1 },
  rotational_hemp: { id: 'rotational_hemp', name: '轮作种麻', outputMultiplier: 1.15, laborMultiplier: 1.05, inputMultiplier: 1 },

  manual_silk: { id: 'manual_silk', name: '手工养蚕', outputMultiplier: 1, laborMultiplier: 1, inputMultiplier: 1 },
  intensive_sericulture: { id: 'intensive_sericulture', name: '精养蚕桑', outputMultiplier: 1.25, laborMultiplier: 1.1, inputMultiplier: 1.05 },

  basic_trade: { id: 'basic_trade', name: '基础商贸', outputMultiplier: 1, laborMultiplier: 1, inputMultiplier: 1 },
  bookkeeping_trade: { id: 'bookkeeping_trade', name: '账簿商贸', outputMultiplier: 1.12, laborMultiplier: 1, inputMultiplier: 1.02 },

  basic_lending: { id: 'basic_lending', name: '民间放贷', outputMultiplier: 1, laborMultiplier: 1, inputMultiplier: 1 },
  formal_lending: { id: 'formal_lending', name: '票据放贷', outputMultiplier: 1.2, laborMultiplier: 1.05, inputMultiplier: 1.05 },

  basic_papermaking: { id: 'basic_papermaking', name: '粗纸制造', outputMultiplier: 1, laborMultiplier: 1, inputMultiplier: 1 },
  alkaline_pulping: { id: 'alkaline_pulping', name: '碱法制浆', outputMultiplier: 1.25, laborMultiplier: 1.1, inputMultiplier: 1.1 },

  manual_logging: { id: 'manual_logging', name: '手工伐木', outputMultiplier: 1, laborMultiplier: 1, inputMultiplier: 1 },
  saw_logging: { id: 'saw_logging', name: '锯木工法', outputMultiplier: 1.18, laborMultiplier: 1.05, inputMultiplier: 1 },

  basic_smithing: { id: 'basic_smithing', name: '基础锻造', outputMultiplier: 1, laborMultiplier: 1, inputMultiplier: 1 },
  water_hammer_smithing: { id: 'water_hammer_smithing', name: '水锤锻造', outputMultiplier: 1.3, laborMultiplier: 1.1, inputMultiplier: 1.15 },

  basic_kiln: { id: 'basic_kiln', name: '土窑烧制', outputMultiplier: 1, laborMultiplier: 1, inputMultiplier: 1 },
  high_temp_kiln: { id: 'high_temp_kiln', name: '高温窑炉', outputMultiplier: 1.22, laborMultiplier: 1.1, inputMultiplier: 1.1 },

  traditional_medicine: { id: 'traditional_medicine', name: '传统药房', outputMultiplier: 1, laborMultiplier: 1, inputMultiplier: 1 },
  compound_medicine: { id: 'compound_medicine', name: '复方制药', outputMultiplier: 1.2, laborMultiplier: 1.1, inputMultiplier: 1.1 },

  basic_inn: { id: 'basic_inn', name: '小型客栈', outputMultiplier: 1, laborMultiplier: 1, inputMultiplier: 1 },
  caravan_inn: { id: 'caravan_inn', name: '驿站客栈', outputMultiplier: 1.15, laborMultiplier: 1.05, inputMultiplier: 1.05 },

  manual_tea: { id: 'manual_tea', name: '人工采茶', outputMultiplier: 1, laborMultiplier: 1, inputMultiplier: 1 },
  terrace_tea: { id: 'terrace_tea', name: '梯田茶园', outputMultiplier: 1.2, laborMultiplier: 1.1, inputMultiplier: 1 },

  solar_evaporation: { id: 'solar_evaporation', name: '日晒制盐', outputMultiplier: 1, laborMultiplier: 1, inputMultiplier: 1 },
  brine_boiling: { id: 'brine_boiling', name: '煎盐工艺', outputMultiplier: 1.25, laborMultiplier: 1.15, inputMultiplier: 1.1 },

  basic_sanitation: { id: 'basic_sanitation', name: '常规保洁', outputMultiplier: 1, laborMultiplier: 1, inputMultiplier: 1 },
  sealed_sanitation: { id: 'sealed_sanitation', name: '密封公厕', outputMultiplier: 1.1, laborMultiplier: 1.05, inputMultiplier: 1.05 },

  dirt_road: { id: 'dirt_road', name: '土路', outputMultiplier: 1, laborMultiplier: 1, inputMultiplier: 1 },
  stone_road: { id: 'stone_road', name: '石板路', outputMultiplier: 1.12, laborMultiplier: 1.05, inputMultiplier: 1.1 },

  basic_storage: { id: 'basic_storage', name: '普通仓储', outputMultiplier: 1, laborMultiplier: 1, inputMultiplier: 1 },
  ventilated_storage: { id: 'ventilated_storage', name: '通风仓储', outputMultiplier: 1.12, laborMultiplier: 1.05, inputMultiplier: 1.05 },

  basic_irrigation: { id: 'basic_irrigation', name: '明渠灌溉', outputMultiplier: 1, laborMultiplier: 1, inputMultiplier: 1 },
  gated_irrigation: { id: 'gated_irrigation', name: '闸控灌溉', outputMultiplier: 1.2, laborMultiplier: 1.1, inputMultiplier: 1.1 },

  basic_fortification: { id: 'basic_fortification', name: '土木城防', outputMultiplier: 1, laborMultiplier: 1, inputMultiplier: 1 },
  reinforced_fortification: { id: 'reinforced_fortification', name: '加固城防', outputMultiplier: 1.15, laborMultiplier: 1.1, inputMultiplier: 1.1 },

  militia: { id: 'militia', name: '乡勇编制', outputMultiplier: 1, laborMultiplier: 1, inputMultiplier: 1 },
  standing_army: { id: 'standing_army', name: '常备军', outputMultiplier: 1.2, laborMultiplier: 1.2, inputMultiplier: 1.2 },

  basic_education: { id: 'basic_education', name: '识字教育', outputMultiplier: 1, laborMultiplier: 1, inputMultiplier: 1 },
  standardized_education: { id: 'standardized_education', name: '程式化教育', outputMultiplier: 1.15, laborMultiplier: 1.1, inputMultiplier: 1.1 },
};
