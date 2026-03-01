export interface PermitMarker {
    lat: number;
    lng: number;
    jobType: string;
    borough: string;
    neighborhood: string;
    address: string;
    zip: string;
    status: string;
    issueDate: string;
}

// Real permit data from BigQuery: lede-nyc-data.civicdata.dob-permits
// Extracted 2026-02-28 via permit-auditor agent
// Job types: NB=New Building, A1=Major Alt, A2=Minor Alt, A3=Equipment, DM=Demolition
export const permitsGeo: PermitMarker[] = [
    { lat: 40.716717, lng: -73.954670, jobType: "A1", borough: "BROOKLYN", neighborhood: "North Side-South Side", address: "65 ROEBLING STREET", zip: "11211", status: "ISSUED", issueDate: "12/30/2025" },
    { lat: 40.760048, lng: -73.986608, jobType: "A2", borough: "MANHATTAN", neighborhood: "Midtown-Midtown South", address: "271 WEST 47TH STREET", zip: "10036", status: "ISSUED", issueDate: "12/30/2025" },
    { lat: 40.593999, lng: -73.796263, jobType: "A1", borough: "QUEENS", neighborhood: "Hammels-Arverne-Edgemere", address: "454 BEACH 67TH STREET", zip: "11692", status: "ISSUED", issueDate: "12/29/2025" },
    { lat: 40.632830, lng: -73.929777, jobType: "A1", borough: "BROOKLYN", neighborhood: "Flatlands", address: "4801 KINGS HIGHWAY", zip: "11234", status: "ISSUED", issueDate: "12/24/2025" },
    { lat: 40.688100, lng: -73.832506, jobType: "A2", borough: "QUEENS", neighborhood: "Richmond Hill", address: "111-16 101 AVENUE", zip: "11419", status: "ISSUED", issueDate: "12/24/2024" },
    { lat: 40.661255, lng: -73.939850, jobType: "A1", borough: "BROOKLYN", neighborhood: "Prospect Lefferts Gardens-Wingate", address: "551 ALBANY AVENUE", zip: "11203", status: "ISSUED", issueDate: "12/19/2025" },
    { lat: 40.686454, lng: -73.944522, jobType: "NB", borough: "BROOKLYN", neighborhood: "Bedford", address: "335 TOMPKINS AVE", zip: "11216", status: "ISSUED", issueDate: "12/19/2025" },
    { lat: 40.656640, lng: -74.003734, jobType: "NB", borough: "BROOKLYN", neighborhood: "Sunset Park West", address: "133 33 STREET", zip: "11232", status: "ISSUED", issueDate: "12/19/2025" },
    { lat: 40.643248, lng: -73.996652, jobType: "NB", borough: "BROOKLYN", neighborhood: "Sunset Park East", address: "929 43RD STREET", zip: "11219", status: "ISSUED", issueDate: "12/19/2025" },
    { lat: 40.670993, lng: -73.938324, jobType: "A2", borough: "BROOKLYN", neighborhood: "Crown Heights North", address: "1201 ST JOHNS PL", zip: "11213", status: "ISSUED", issueDate: "12/19/2025" },
    { lat: 40.732468, lng: -73.709423, jobType: "A2", borough: "QUEENS", neighborhood: "Glen Oaks-Floral Park-New Hyde Park", address: "86-15 257 STREET", zip: "11001", status: "ISSUED", issueDate: "12/17/2025" },
    { lat: 40.842571, lng: -73.942097, jobType: "A2", borough: "MANHATTAN", neighborhood: "Washington Heights South", address: "216 FORT WASHINGTON AVENUE", zip: "10032", status: "ISSUED", issueDate: "12/17/2025" },
    { lat: 40.707641, lng: -74.006528, jobType: "NB", borough: "MANHATTAN", neighborhood: "Battery Park City-Lower Manhattan", address: "7 PLATT STREET", zip: "10038", status: "ISSUED", issueDate: "12/16/2025" },
    { lat: 40.751512, lng: -73.984058, jobType: "A2", borough: "MANHATTAN", neighborhood: "Midtown-Midtown South", address: "38 W 38 STREET", zip: "10018", status: "ISSUED", issueDate: "12/15/2025" },
    { lat: 40.614557, lng: -73.912915, jobType: "A2", borough: "BROOKLYN", neighborhood: "Georgetown-Marine Park-Bergen Beach-Mill Basin", address: "2150 MILL AVENUE", zip: "11234", status: "ISSUED", issueDate: "12/10/2025" },
    { lat: 40.711122, lng: -73.952239, jobType: "A1", borough: "BROOKLYN", neighborhood: "North Side-South Side", address: "469 GRAND STREET", zip: "11211", status: "ISSUED", issueDate: "12/09/2025" },
    { lat: 40.801734, lng: -73.949880, jobType: "A2", borough: "MANHATTAN", neighborhood: "Central Harlem South", address: "110 LENOX AVENUE", zip: "10026", status: "ISSUED", issueDate: "12/08/2025" },
    { lat: 40.779843, lng: -73.960498, jobType: "A2", borough: "MANHATTAN", neighborhood: "Upper East Side-Carnegie Hill", address: "18 EAST 84 ST", zip: "10028", status: "ISSUED", issueDate: "12/05/2025" },
    { lat: 40.837342, lng: -73.870026, jobType: "NB", borough: "BRONX", neighborhood: "West Farms-Bronx River", address: "1479 ROSEDALE AVE", zip: "10460", status: "ISSUED", issueDate: "12/02/2025" },
    { lat: 40.761245, lng: -73.740594, jobType: "A2", borough: "QUEENS", neighborhood: "Douglas Manor-Douglaston-Little Neck", address: "243-17 VAN ZANDT AVENUE", zip: "11362", status: "ISSUED", issueDate: "12/02/2025" },
    { lat: 40.817312, lng: -73.942527, jobType: "A2", borough: "MANHATTAN", neighborhood: "Central Harlem North-Polo Grounds", address: "200 WEST 138 STREET", zip: "10030", status: "ISSUED", issueDate: "12/02/2025" },
    { lat: 40.739167, lng: -74.001119, jobType: "NB", borough: "MANHATTAN", neighborhood: "Hudson Yards-Chelsea-Flatiron-Union Square", address: "251 WEST 14TH STREET", zip: "10011", status: "ISSUED", issueDate: "11/27/2024" },
    { lat: 40.745947, lng: -73.701399, jobType: "A1", borough: "QUEENS", neighborhood: "Glen Oaks-Floral Park-New Hyde Park", address: "80-48 LANGDALE STREET", zip: "11040", status: "ISSUED", issueDate: "11/24/2025" },
    { lat: 40.674295, lng: -73.967385, jobType: "A2", borough: "BROOKLYN", neighborhood: "Prospect Heights", address: "314 SAINT JOHN'S PLACE", zip: "11238", status: "ISSUED", issueDate: "11/17/2023" },
    { lat: 40.726663, lng: -73.907122, jobType: "A1", borough: "QUEENS", neighborhood: "Maspeth", address: "59-60 55TH ROAD", zip: "11378", status: "ISSUED", issueDate: "11/14/2025" },
    { lat: 40.818279, lng: -73.913046, jobType: "NB", borough: "BRONX", neighborhood: "Melrose South-Mott Haven North", address: "671 BROOK AVENUE", zip: "10455", status: "ISSUED", issueDate: "11/06/2025" },
    { lat: 40.648171, lng: -74.016894, jobType: "A1", borough: "BROOKLYN", neighborhood: "Sunset Park West", address: "219 51 STREET", zip: "11220", status: "ISSUED", issueDate: "11/05/2025" },
    { lat: 40.654812, lng: -74.005240, jobType: "A1", borough: "BROOKLYN", neighborhood: "Sunset Park West", address: "365 36 STREET", zip: "11232", status: "ISSUED", issueDate: "10/29/2025" },
    { lat: 40.702145, lng: -73.826892, jobType: "A2", borough: "QUEENS", neighborhood: "Richmond Hill", address: "86-11 124 STREET", zip: "11418", status: "ISSUED", issueDate: "10/29/2025" },
    { lat: 40.701946, lng: -73.945188, jobType: "NB", borough: "BROOKLYN", neighborhood: "Bedford", address: "78 BARTLETT STREET", zip: "11206", status: "ISSUED", issueDate: "10/29/2025" },
    { lat: 40.760612, lng: -73.833642, jobType: "NB", borough: "QUEENS", neighborhood: "Flushing", address: "133-36 37 AVENUE", zip: "11354", status: "ISSUED", issueDate: "10/29/2025" },
    { lat: 40.683536, lng: -73.943937, jobType: "A1", borough: "BROOKLYN", neighborhood: "Bedford", address: "407 TOMPKINS AVE", zip: "11216", status: "ISSUED", issueDate: "10/28/2025" },
    { lat: 40.707399, lng: -73.954936, jobType: "A2", borough: "BROOKLYN", neighborhood: "North Side-South Side", address: "373 BROADWAY", zip: "11211", status: "ISSUED", issueDate: "10/23/2025" },
    { lat: 40.743740, lng: -74.006066, jobType: "A1", borough: "MANHATTAN", neighborhood: "Hudson Yards-Chelsea-Flatiron-Union Square", address: "458 WEST 17TH STREET", zip: "10011", status: "ISSUED", issueDate: "10/22/2025" },
    { lat: 40.580315, lng: -74.126529, jobType: "A2", borough: "STATEN ISLAND", neighborhood: "Todt Hill-Emerson Hill-Heartland Village-Lighthouse Hill", address: "32 NEVADA AVE", zip: "10306", status: "ISSUED", issueDate: "10/09/2025" },
    { lat: 40.844630, lng: -73.889562, jobType: "A2", borough: "BRONX", neighborhood: "East Tremont", address: "744 EAST TREMONT AVENUE", zip: "10457", status: "ISSUED", issueDate: "09/20/2023" },
    { lat: 40.765914, lng: -73.984975, jobType: "A1", borough: "MANHATTAN", neighborhood: "Clinton", address: "337 WEST 55 STREET", zip: "10019", status: "ISSUED", issueDate: "09/12/2025" },
    { lat: 40.765914, lng: -73.984975, jobType: "A2", borough: "MANHATTAN", neighborhood: "Clinton", address: "337 WEST 55 STREET", zip: "10019", status: "ISSUED", issueDate: "09/12/2025" },
    { lat: 40.859842, lng: -73.903006, jobType: "A2", borough: "BRONX", neighborhood: "Fordham South", address: "2347 JEROME AVENUE", zip: "10468", status: "ISSUED", issueDate: "09/04/2025" },
    { lat: 40.646847, lng: -74.001348, jobType: "A2", borough: "BROOKLYN", neighborhood: "Sunset Park East", address: "4200 7 AVENUE", zip: "11232", status: "ISSUED", issueDate: "08/13/2003" },
    { lat: 40.772388, lng: -73.931652, jobType: "NB", borough: "QUEENS", neighborhood: "Old Astoria", address: "8-29 ASTORIA BOULEVARD", zip: "11102", status: "ISSUED", issueDate: "07/30/2025" },
    { lat: 40.669369, lng: -73.941440, jobType: "A1", borough: "BROOKLYN", neighborhood: "Crown Heights North", address: "803 EASTERN PARKWAY", zip: "11213", status: "ISSUED", issueDate: "07/17/2024" },
    { lat: 40.671675, lng: -73.863381, jobType: "A1", borough: "BROOKLYN", neighborhood: "East New York", address: "760 ELDERT LANE", zip: "11208", status: "ISSUED", issueDate: "05/13/2025" },
    { lat: 40.759514, lng: -73.997289, jobType: "A3", borough: "MANHATTAN", neighborhood: "Hudson Yards-Chelsea-Flatiron-Union Square", address: "520 WEST 41ST STREET", zip: "10036", status: "ISSUED", issueDate: "03/20/2025" },
    { lat: 40.666865, lng: -73.857886, jobType: "NB", borough: "BROOKLYN", neighborhood: "East New York", address: "1391 STANLEY AVENUE", zip: "11208", status: "ISSUED", issueDate: "03/18/2025" },
    { lat: 40.714607, lng: -74.008903, jobType: "A3", borough: "MANHATTAN", neighborhood: "SoHo-TriBeCa-Civic Center-Little Italy", address: "46 WARREN STREET", zip: "10007", status: "ISSUED", issueDate: "01/21/2026" },
    { lat: 40.714261, lng: -73.998745, jobType: "A1", borough: "MANHATTAN", neighborhood: "Chinatown", address: "20 MOTT STREET", zip: "10013", status: "ISSUED", issueDate: "01/30/2026" },
];
