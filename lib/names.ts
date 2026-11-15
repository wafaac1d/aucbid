import { baseModelName, displayName, modelKey, nameKey, normalizeMake } from "./format";

type Fix = { make: string; model: string };

const fixes = new Map<string, Fix>();
const labels = new Map<string, string>();

function add(make: string, model: string, variants: string[], nextMake = ""): void {
  const current = nameKey(normalizeMake(make));
  const targetMake = nextMake ? normalizeMake(nextMake) : "";
  for (const variant of variants) fixes.set(`${current}|${nameKey(variant)}`, { make: targetMake, model });
  if (!model) return;
  labels.set(`${nameKey(targetMake || normalizeMake(make))}|${modelKey(model)}`, model);
}

add("Acura", "CL", ["3.0CL", "3.2CL"]);
add("Acura", "Integra", ["Integra TY"]);
add("Acura", "RL", ["3.5RL"]);
add("Acura", "TL", ["3.2TL"]);
add("Audi", "A6", ["A6 Quattro"]);
add("Audi", "Q3", ["Q3 Prestige Fronttra"]);
add("Audi", "S4", ["S4 Quattro"]);
add("Audi", "S6", ["S6 Premium Plus"]);
add("BMW", "320", ["320 I Xdrive"]);
add("BMW", "530", ["530 XI"]);
add("BMW", "750", ["750 XI"]);
add("Buick", "Century", ["Century CU"]);
add("Buick", "Electra", ["Elect"]);
add("Buick", "Enclave", ["Enclacv"]);
add("Buick", "Lacrosse", ["Lacross"]);
add("Buick", "Lesabre", ["Lasabre"]);
add("Buick", "Lucerne", ["Lucerne CXL"]);
add("Cadillac", "Escalade", ["Escalade ESV Sport"]);
add("Cadillac", "Fleetwood", ["Fleetwoo"]);
add("Cadillac", "SRX", ["SRX V6"]);
add("Chevrolet", "Blazer", ["Blazer 4D Truck"]);
add("Chevrolet", "C/K", ["C/K 10 Series"]);
add("Chevrolet", "C10", ["C10 Fleetside W/Long", "C10 PU"]);
add("Chevrolet", "Camaro", ["Camero"]);
add("Chevrolet", "Chevelle", ["Chevelle M"]);
add("Chevrolet", "Colorado", ["Colorado, CA"]);
add("Chevrolet", "Corvette", ["Corvette Stingray", "Corvette Z06"]);
add("Chevrolet", "Cruze", ["Crusie", "Cruz"]);
add("Chevrolet", "Equinox", ["Eqinox", "Equanoix", "Equinix"]);
add("Chevrolet", "Express", ["Express Cargo", "Express Cutaway"]);
add("Chevrolet", "GMT", ["GMT 400 K1"]);
add("Chevrolet", "Impala", ["Impalla"]);
add("Chevrolet", "Montecarlo", ["Monte Crlo"]);
add("Chevrolet", "Pickup", ["Pickup Truck"]);
add("Chevrolet", "S10", ["S Truck"]);
add("Chevrolet", "Silverado", [
  "1500 Silverado",
  "1500 PU EXT C 1/2T 4",
  "Silve",
  "Silver1500",
  "Silverado 1500 LS CR",
  "Silverado K1500",
  "Silverado K2500 Heav",
  "Silverado K2500 Heavy Duty",
  "Slv1500 CRW",
  "Slvrdo 1500 4X2 NEW",
]);
add("Chevrolet", "Suburban", ["Subrban", "Suburban K1500", "Suburban 1/2 TON"]);
add("Chevrolet", "Tahoe", ["Taho", "Tahoe C1500"]);
add("Chevrolet", "Trailblazer", ["Trlbzrlslt"]);
add("Chrysler", "300", ["300 Limite"]);
add("Chrysler", "Cordoba", ["Cordoba 2 Doors"]);
add("Chrysler", "Sebring", ["Sebring LX"]);
add("Chrysler", "Town & Country", ["Town & CNT", "Town & Cntry", "Town AND Country", "TWN & Ctry"]);
add("Dodge", "Caravan", ["Carvan"]);
add("Dodge", "Dart", ["Dart Aero", "Dart GT"]);
add("Dodge", "Durango", ["Durango Citadel", "Durango Limit", "Durango R/T"]);
add("Dodge", "RAM", ["RAM 1500 ST", "RAM 2500 BIG Horn", "RAM PU1500", "Ram1500", "Ram1500 Crew Quad"]);
add("Ford", "Bronco", ["Bronco Outer Banks A"]);
add("Ford", "Econoline", ["Ecolone", "E-150", "E-250", "E-350 Super Duty"]);
add("Ford", "Escape", ["Escape 4D ACT", "Escape Active", "Escape ST Line"]);
add("Ford", "Expedition", ["Expdtion"]);
add("Ford", "Explorer", ["Exlplorer", "Expl"]);
add("Ford", "F100", ["F-100 1/2 TON"]);
add("Ford", "F150", ["F-150 Stysd", "F-150 XL", "F150 Super", "F150 Supercrew"]);
add("Ford", "F250", ["F250 Super Duty", "Super Duty F-250 LAR", "Super Duty F-250 W/S"]);
add("Ford", "F350", ["F350 Super", "F350 XL"]);
add("Ford", "Fusion", ["Fushion", "Fusion Titanium"]);
add("Ford", "Galaxie", ["Galaxy"]);
add("Ford", "Maverick", ["Maverick XL"]);
add("Ford", "Mustang", ["Mstg Motor", "Must-Salee", "Mustang Ghia", "Mustang Grande"]);
add("Ford", "Ranchero", ["Ranchero GT"]);
add("Ford", "Thunderbird", ["T-Bird"]);
add("Ford", "Transit", ["Transit 25"]);
add("GMC", "Sierra", ["NEW Sierra", "Sierra K2500"]);
add("Honda", "Accord", ["Acord", "Accord LX", "Accord SPO"]);
add("Honda", "Acty", ["Acty SDX"]);
add("Honda", "Civic", ["Civc", "Civic 2D DX", "Civic Hybrid 4D Seda", "Civic LX", "Civic Spor"]);
add("Honda", "Crosstour", ["Accord Crosstour"]);
add("Honda", "CRV", ["CR-V LX", "CR-V Sport"]);
add("Honda", "Odyssey", ["Odessey", "Odyss"]);
add("Hyundai", "Accent", ["Accent Limited W/INT"]);
add("Hyundai", "Elantra", ["Elentra", "Elantra GLS"]);
add("Hyundai", "Santa FE", ["Sante FE", "Santa FE GLS"]);
add("Hyundai", "Sonata", ["Sonata GLS", "Sonata Sport"]);
add("Hyundai", "Tucson", ["Tuscon", "Tucson Night"]);
add("Jaguar", "E - Type", ["XKE"]);
add("Jaguar", "F-Pace", ["F-Pace PRE"]);
add("Jaguar", "I-Pace", ["I-Pace HSE"]);
add("Jeep", "Cherokee", ["Cheeroke", "Cheerokee"]);
add("Jeep", "CJ5", ["Jeep CJ5"]);
add("Jeep", "Grandcherokee", [
  "GR Cheroke",
  "GR Cherokee",
  "Gran Cher",
  "Grand Cher",
  "Grand Cheroke",
  "Grand Cherokee Altit",
  "Grand Cherokee Laredo",
]);
add("Jeep", "Patriot", ["Patriot LA", "Patriot Sport"]);
add("Jeep", "Wrangler", ["Wrang", "Wranger", "Wrangler JK Altitude"]);
add("KIA", "K5", ["K5 GT Line"]);
add("KIA", "Optima", ["Optima SX", "Optima XS"]);
add("KIA", "Sportage", ["Sportage LX"]);
add("Land Rover", "Range Rover", ["Range Rove", "Range Rover HSE", "Range Rover HSE Diesel"]);
add("Lexus", "ES", ["ES300", "ES350"]);
add("Lexus", "GS", ["GS400", "GS460"]);
add("Lexus", "RX", ["RX350"]);
add("Lincoln", "Aviator", ["Aviator Black Label"]);
add("Lincoln", "Continental", ["Continentl"]);
add("Lincoln", "Town CAR", ["Town CAR 4 Doors"]);
add("Maserati", "Levante", ["Levante LU"]);
add("Mazda", "3", ["Mazda 3", "3 S Grand Touring AU"]);
add("Mazda", "5", ["MAZDA5"]);
add("Mazda", "6", ["Mazda 6", "6 I Touring Automati"]);
add("Mazda", "CX-30", ["CX-30 Sele"]);
add("Mazda", "CX-5", ["CX-5 Touri"]);
add("Mazda", "MX-5 Miata", ["MX-5", "Miata MX5"]);
add("Mazda", "Speed", ["Speed 3"]);
add("Mercedes-Benz", "280", ["280CE,"]);
add("Mercedes-Benz", "420", ["420 Series"]);
add("Mercedes-Benz", "A", ["A-Class"]);
add("Mercedes-Benz", "C", ["C-Class", "C-Class C300", "C300", "C300 Sadan 4", "C63 AMG"]);
add("Mercedes-Benz", "CLA", ["CLA Class CLA250"]);
add("Mercedes-Benz", "E", ["E-Class", "E Class E350 4D Seda"]);
add("Mercedes-Benz", "G", ["G550"]);
add("Mercedes-Benz", "GL", ["GL-Class GL550 4MATI"]);
add("Mercedes-Benz", "ML", ["ML320"]);
add("Mercedes-Benz", "R", ["R-Class", "R-Class R320 CDI"]);
add("Mercedes-Benz", "S", ["S-Class", "S Class S55", "S-Class S550", "S500"]);
add("Mercedes-Benz", "SL", ["SL-Class", "SL SL450", "SL450"]);
add("Mitsubishi", "Galant", ["Galant VR4"]);
add("Nissan", "Altima", ["Altama", "Altima S M"]);
add("Nissan", "Maxima", ["810/Maxima", "Maxima 3.5 S/SV"]);
add("Nissan", "NV", ["NV Passenger NV3500"]);
add("Nissan", "Sentra", ["Sentra S W/Continuou", "Sentra XE"]);
add("Oldsmobile", "Cutlass Supreme", ["Culasssupr"]);
add("Pontiac", "Firebird", ["Firebrd TA"]);
add("Pontiac", "Vibe", ["Vibe SW"]);
add("Porsche", "911", ["911 NEW Generation"]);
add("Porsche", "Panamera", ["Panamera4s"]);
add("RAM", "1500", ["1500 BIG Horn/Lone", "1500 Rebel", "1500 ST"]);
add("RAM", "2500", ["2500 Tradesman"]);
add("Rivian", "R1S", ["R1S Adventure"]);
add("Subaru", "Crosstrek", ["XV Crosstrek"]);
add("Subaru", "Impreza", ["Impreza Outback 4D W"]);
add("Subaru", "Tribeca", ["B9 Tribeca"]);
add("Subaru", "WRX", ["Impreza WRX", "Imprza WRX", "WRX Manual"]);
add("Tesla", "Model 3", ["MDL 3"]);
add("Tesla", "Model Y", ["MDL Y"]);
add("Toyota", "Avalon", ["Alavon", "Avlnxl/XLS", "Avalon XL/XLS/TOU/LT"]);
add("Toyota", "Camry", ["Camary", "Camrry", "Camry CE", "Camry SE Manual", "Camry SE Night Shade", "Camry STD/LE/XLE/SE", "Camry XSE"]);
add("Toyota", "Celica", ["Celica 2D GT"]);
add("Toyota", "Corolla", ["Coralla", "Coroilla", "Corrolla", "Corolla Base 4D Seda", "Corolla L/LE/XL"]);
add("Toyota", "Corolla Cross", ["Corolla CRS"]);
add("Toyota", "Crown", ["Crown Royal Saloon"]);
add("Toyota", "Highlander", ["Highla"]);
add("Toyota", "Matrix", ["Matrix/S", "Corolla Matrix"]);
add("Toyota", "Pickup", ["Pickup / CAB Chassis"]);
add("Toyota", "Prius", ["Pirus"]);
add("Toyota", "RAV4", ["RAV4 Limit"]);
add("Toyota", "Sequoia", ["Seqouia"]);
add("Toyota", "Sienna", ["Siena", "Sienna CE"]);
add("Toyota", "Tundra", ["TUN Crmax", "Tundra Crewmax"]);
add("Vanderhull", "Carmel", ["Crmlblkjk"]);
add("Volkswagen", "Beetle", ["Beetle CON"]);
add("Volkswagen", "Buggy", ["Dunebuggy"]);
add("Volkswagen", "CC", ["Passat CC"]);
add("Volkswagen", "GTI", ["NEW GTI"]);
add("Volkswagen", "Jetta", ["NEW Jetta", "City Jetta", "Jetta GLI", "Jetta SW"]);
add("Volkswagen", "Touareg", ["Touareg 2"]);
add("Volkswagen", "Transporter", ["Transorter"]);
add("Volvo", "850", ["850 Series"]);

add("Chevrolet", "Prizm", ["GEO Prizm"], "GEO");
add("Mercedes-Benz", "Fortwo", ["Smrt FOR 2"], "Smart");
add("Toyota", "FR-S", ["Scion FR-S"], "Scion");
add("Toyota", "IQ", ["Scion IQ"], "Scion");
add("Toyota", "TC", ["Scion TC"], "Scion");
add("Toyota", "XA", ["Scion XA"], "Scion");
add("Toyota", "XB", ["Scion XB"], "Scion");

add("American", "", ["UK"]);
add("Chevrolet", "", ["Other", "UK"]);
add("Datsun", "", ["UK"]);
add("Dodge", "", ["UK"]);
add("Fiat", "", ["ALL Models"]);
add("Ford", "", ["(NO Model)", "Ford", "UK", "Unknown Model"]);
add("Buick", "", ["UKN"]);
add("Jaguar", "", ["ALL Models"]);
add("Jeep", "", ["Kari-Kool Transports"]);
add("Mercedes-Benz", "", ["UK", "Agriculture AND Farm Equipment"]);
add("Mitsubishi", "", ["Unknown Model"]);
add("Plymouth", "", ["UK"]);
add("Pontiac", "", ["UK"]);
add("Toyota", "", ["Unknown"]);
add("Triumph CAR", "", ["UK"]);
add("Volkswagen", "", ["ALL Other", "UNK", "Type"]);
add("Other", "", ["Other"]);

function findFix(make: string, model: string): Fix | undefined {
  const makeKey = nameKey(make);
  const direct = fixes.get(`${makeKey}|${nameKey(model)}`);
  if (direct) return direct;
  const base = baseModelName(model);
  if (!base || nameKey(base) === nameKey(model)) return undefined;
  return fixes.get(`${makeKey}|${nameKey(base)}`);
}

export function canonicalLotNames(makeRaw: string, modelRaw: string): { make: string; model: string | null } {
  const make = normalizeMake(makeRaw);
  const fix = findFix(make, modelRaw);
  if (!fix) return { make, model: null };
  return { make: fix.make || make, model: fix.model };
}

export function preferredModelName(makeRaw: string, modelRaw: string): string | null {
  const names = canonicalLotNames(makeRaw, modelRaw);
  if (names.model === "") return null;
  const model = names.model ?? (baseModelName(modelRaw) || displayName(modelRaw));
  if (!model) return null;
  return labels.get(`${nameKey(names.make)}|${modelKey(model)}`) || model;
}
