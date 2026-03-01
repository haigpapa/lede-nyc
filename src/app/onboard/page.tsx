'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useNeighborhood, type NeighborhoodProfile } from '@/context/NeighborhoodContext';
import LedeLogo from '@/components/LedeLogo';

// ── NYC ZIP → neighborhood lookup (all 5 boroughs) ──────────────────────────
const ZIP_MAP: Record<string, { displayName: string; borough: string; lat: number; lng: number }> = {
    // ── Manhattan ────────────────────────────────────────────────────────────
    '10001': { displayName: "Chelsea",               borough: "Manhattan", lat: 40.7484, lng: -73.9967 },
    '10002': { displayName: "Lower East Side",        borough: "Manhattan", lat: 40.7157, lng: -73.9863 },
    '10003': { displayName: "East Village",           borough: "Manhattan", lat: 40.7316, lng: -73.9890 },
    '10004': { displayName: "Financial District",     borough: "Manhattan", lat: 40.7004, lng: -74.0397 },
    '10005': { displayName: "Financial District",     borough: "Manhattan", lat: 40.7077, lng: -74.0109 },
    '10006': { displayName: "Financial District",     borough: "Manhattan", lat: 40.7085, lng: -74.0134 },
    '10007': { displayName: "City Hall",              borough: "Manhattan", lat: 40.7135, lng: -74.0077 },
    '10009': { displayName: "Alphabet City",          borough: "Manhattan", lat: 40.7265, lng: -73.9796 },
    '10010': { displayName: "Gramercy Park",          borough: "Manhattan", lat: 40.7388, lng: -73.9827 },
    '10011': { displayName: "West Chelsea",           borough: "Manhattan", lat: 40.7467, lng: -74.0019 },
    '10012': { displayName: "SoHo",                   borough: "Manhattan", lat: 40.7256, lng: -74.0015 },
    '10013': { displayName: "TriBeCa",                borough: "Manhattan", lat: 40.7195, lng: -74.0054 },
    '10014': { displayName: "West Village",           borough: "Manhattan", lat: 40.7335, lng: -74.0059 },
    '10016': { displayName: "Murray Hill",            borough: "Manhattan", lat: 40.7452, lng: -73.9816 },
    '10017': { displayName: "Midtown East",           borough: "Manhattan", lat: 40.7527, lng: -73.9772 },
    '10018': { displayName: "Hell's Kitchen North",   borough: "Manhattan", lat: 40.7556, lng: -73.9940 },
    '10019': { displayName: "Midtown West",           borough: "Manhattan", lat: 40.7659, lng: -73.9861 },
    '10020': { displayName: "Rockefeller Center",     borough: "Manhattan", lat: 40.7583, lng: -73.9798 },
    '10021': { displayName: "Upper East Side",        borough: "Manhattan", lat: 40.7721, lng: -73.9571 },
    '10022': { displayName: "Sutton Place",           borough: "Manhattan", lat: 40.7593, lng: -73.9673 },
    '10023': { displayName: "Upper West Side",        borough: "Manhattan", lat: 40.7810, lng: -73.9814 },
    '10024': { displayName: "Upper West Side North",  borough: "Manhattan", lat: 40.7870, lng: -73.9754 },
    '10025': { displayName: "Morningside Heights",    borough: "Manhattan", lat: 40.7981, lng: -73.9680 },
    '10026': { displayName: "Central Harlem",         borough: "Manhattan", lat: 40.8033, lng: -73.9535 },
    '10027': { displayName: "Harlem",                 borough: "Manhattan", lat: 40.8116, lng: -73.9525 },
    '10028': { displayName: "Carnegie Hill",          borough: "Manhattan", lat: 40.7764, lng: -73.9539 },
    '10029': { displayName: "East Harlem",            borough: "Manhattan", lat: 40.7957, lng: -73.9443 },
    '10030': { displayName: "Central Harlem North",   borough: "Manhattan", lat: 40.8185, lng: -73.9437 },
    '10031': { displayName: "Hamilton Heights",       borough: "Manhattan", lat: 40.8231, lng: -73.9497 },
    '10032': { displayName: "Washington Heights",     borough: "Manhattan", lat: 40.8356, lng: -73.9393 },
    '10033': { displayName: "Washington Heights",     borough: "Manhattan", lat: 40.8468, lng: -73.9349 },
    '10034': { displayName: "Inwood",                 borough: "Manhattan", lat: 40.8675, lng: -73.9219 },
    '10035': { displayName: "East Harlem North",      borough: "Manhattan", lat: 40.8032, lng: -73.9334 },
    '10036': { displayName: "Hell's Kitchen",         borough: "Manhattan", lat: 40.7609, lng: -73.9930 },
    '10037': { displayName: "Harlem River",           borough: "Manhattan", lat: 40.8148, lng: -73.9400 },
    '10038': { displayName: "Lower Manhattan",        borough: "Manhattan", lat: 40.7093, lng: -74.0030 },
    '10039': { displayName: "Sugar Hill",             borough: "Manhattan", lat: 40.8239, lng: -73.9412 },
    '10040': { displayName: "Fort George",            borough: "Manhattan", lat: 40.8583, lng: -73.9303 },
    '10044': { displayName: "Roosevelt Island",       borough: "Manhattan", lat: 40.7612, lng: -73.9505 },
    '10065': { displayName: "Upper East Side",        borough: "Manhattan", lat: 40.7646, lng: -73.9606 },
    '10075': { displayName: "Upper East Side",        borough: "Manhattan", lat: 40.7739, lng: -73.9528 },
    '10128': { displayName: "Upper East Side",        borough: "Manhattan", lat: 40.7797, lng: -73.9509 },
    // ── Brooklyn ─────────────────────────────────────────────────────────────
    '11201': { displayName: "Brooklyn Heights",       borough: "Brooklyn",  lat: 40.6958, lng: -73.9936 },
    '11203': { displayName: "East Flatbush",          borough: "Brooklyn",  lat: 40.6501, lng: -73.9358 },
    '11204': { displayName: "Bensonhurst",            borough: "Brooklyn",  lat: 40.6201, lng: -73.9916 },
    '11205': { displayName: "Clinton Hill",           borough: "Brooklyn",  lat: 40.6936, lng: -73.9672 },
    '11206': { displayName: "Bushwick",               borough: "Brooklyn",  lat: 40.7055, lng: -73.9397 },
    '11207': { displayName: "East New York",          borough: "Brooklyn",  lat: 40.6629, lng: -73.8874 },
    '11208': { displayName: "Cypress Hills",          borough: "Brooklyn",  lat: 40.6685, lng: -73.8704 },
    '11209': { displayName: "Bay Ridge",              borough: "Brooklyn",  lat: 40.6200, lng: -74.0302 },
    '11210': { displayName: "Flatbush",               borough: "Brooklyn",  lat: 40.6351, lng: -73.9448 },
    '11211': { displayName: "Williamsburg",           borough: "Brooklyn",  lat: 40.7081, lng: -73.9571 },
    '11212': { displayName: "Brownsville",            borough: "Brooklyn",  lat: 40.6607, lng: -73.9176 },
    '11213': { displayName: "Crown Heights",          borough: "Brooklyn",  lat: 40.6697, lng: -73.9422 },
    '11214': { displayName: "Bath Beach",             borough: "Brooklyn",  lat: 40.6003, lng: -73.9987 },
    '11215': { displayName: "Park Slope",             borough: "Brooklyn",  lat: 40.6681, lng: -73.9847 },
    '11216': { displayName: "Bedford-Stuyvesant",     borough: "Brooklyn",  lat: 40.6828, lng: -73.9442 },
    '11217': { displayName: "Boerum Hill",            borough: "Brooklyn",  lat: 40.6844, lng: -73.9826 },
    '11218': { displayName: "Kensington",             borough: "Brooklyn",  lat: 40.6442, lng: -73.9771 },
    '11219': { displayName: "Borough Park",           borough: "Brooklyn",  lat: 40.6300, lng: -73.9987 },
    '11220': { displayName: "Sunset Park",            borough: "Brooklyn",  lat: 40.6389, lng: -74.0143 },
    '11221': { displayName: "Bushwick North",         borough: "Brooklyn",  lat: 40.6940, lng: -73.9223 },
    '11222': { displayName: "Greenpoint",             borough: "Brooklyn",  lat: 40.7297, lng: -73.9506 },
    '11223': { displayName: "Gravesend",              borough: "Brooklyn",  lat: 40.5993, lng: -73.9699 },
    '11224': { displayName: "Coney Island",           borough: "Brooklyn",  lat: 40.5755, lng: -73.9831 },
    '11225': { displayName: "Prospect Lefferts",      borough: "Brooklyn",  lat: 40.6573, lng: -73.9556 },
    '11226': { displayName: "Flatbush",               borough: "Brooklyn",  lat: 40.6412, lng: -73.9571 },
    '11228': { displayName: "Dyker Heights",          borough: "Brooklyn",  lat: 40.6207, lng: -74.0149 },
    '11229': { displayName: "Sheepshead Bay",         borough: "Brooklyn",  lat: 40.5989, lng: -73.9434 },
    '11230': { displayName: "Midwood",                borough: "Brooklyn",  lat: 40.6229, lng: -73.9596 },
    '11231': { displayName: "Red Hook",               borough: "Brooklyn",  lat: 40.6751, lng: -74.0077 },
    '11232': { displayName: "Sunset Park",            borough: "Brooklyn",  lat: 40.6536, lng: -74.0037 },
    '11233': { displayName: "Ocean Hill",             borough: "Brooklyn",  lat: 40.6768, lng: -73.9170 },
    '11234': { displayName: "Marine Park",            borough: "Brooklyn",  lat: 40.6178, lng: -73.9217 },
    '11235': { displayName: "Brighton Beach",         borough: "Brooklyn",  lat: 40.5786, lng: -73.9617 },
    '11236': { displayName: "Canarsie",               borough: "Brooklyn",  lat: 40.6398, lng: -73.9032 },
    '11237': { displayName: "Ridgewood",              borough: "Brooklyn",  lat: 40.7052, lng: -73.9091 },
    '11238': { displayName: "Prospect Heights",       borough: "Brooklyn",  lat: 40.6779, lng: -73.9634 },
    '11239': { displayName: "Georgetown",             borough: "Brooklyn",  lat: 40.6469, lng: -73.8878 },
    // ── Queens ───────────────────────────────────────────────────────────────
    '11001': { displayName: "Floral Park",            borough: "Queens",    lat: 40.7226, lng: -73.7062 },
    '11004': { displayName: "Glen Oaks",              borough: "Queens",    lat: 40.7479, lng: -73.7110 },
    '11101': { displayName: "Long Island City",       borough: "Queens",    lat: 40.7447, lng: -73.9485 },
    '11102': { displayName: "Astoria",                borough: "Queens",    lat: 40.7727, lng: -73.9302 },
    '11103': { displayName: "Astoria",                borough: "Queens",    lat: 40.7628, lng: -73.9224 },
    '11104': { displayName: "Sunnyside",              borough: "Queens",    lat: 40.7449, lng: -73.9198 },
    '11105': { displayName: "Astoria",                borough: "Queens",    lat: 40.7754, lng: -73.9106 },
    '11106': { displayName: "Astoria",                borough: "Queens",    lat: 40.7641, lng: -73.9302 },
    '11354': { displayName: "Flushing",               borough: "Queens",    lat: 40.7676, lng: -73.8330 },
    '11355': { displayName: "Flushing South",         borough: "Queens",    lat: 40.7504, lng: -73.8279 },
    '11356': { displayName: "College Point",          borough: "Queens",    lat: 40.7848, lng: -73.8434 },
    '11357': { displayName: "Whitestone",             borough: "Queens",    lat: 40.7928, lng: -73.8126 },
    '11358': { displayName: "Flushing North",         borough: "Queens",    lat: 40.7591, lng: -73.7989 },
    '11360': { displayName: "Bayside",                borough: "Queens",    lat: 40.7841, lng: -73.7726 },
    '11361': { displayName: "Bayside",                borough: "Queens",    lat: 40.7720, lng: -73.7655 },
    '11362': { displayName: "Little Neck",            borough: "Queens",    lat: 40.7580, lng: -73.7354 },
    '11363': { displayName: "Douglas Manor",          borough: "Queens",    lat: 40.7707, lng: -73.7489 },
    '11364': { displayName: "Oakland Gardens",        borough: "Queens",    lat: 40.7447, lng: -73.7613 },
    '11365': { displayName: "Fresh Meadows",          borough: "Queens",    lat: 40.7356, lng: -73.7900 },
    '11366': { displayName: "Fresh Meadows",          borough: "Queens",    lat: 40.7259, lng: -73.7878 },
    '11367': { displayName: "Kew Gardens Hills",      borough: "Queens",    lat: 40.7255, lng: -73.8284 },
    '11368': { displayName: "Corona",                 borough: "Queens",    lat: 40.7479, lng: -73.8621 },
    '11369': { displayName: "East Elmhurst",          borough: "Queens",    lat: 40.7600, lng: -73.8738 },
    '11370': { displayName: "East Elmhurst",          borough: "Queens",    lat: 40.7659, lng: -73.8860 },
    '11371': { displayName: "Flushing Airport",       borough: "Queens",    lat: 40.7726, lng: -73.8717 },
    '11372': { displayName: "Jackson Heights",        borough: "Queens",    lat: 40.7484, lng: -73.8878 },
    '11373': { displayName: "Elmhurst",               borough: "Queens",    lat: 40.7368, lng: -73.8799 },
    '11374': { displayName: "Rego Park",              borough: "Queens",    lat: 40.7255, lng: -73.8629 },
    '11375': { displayName: "Forest Hills",           borough: "Queens",    lat: 40.7196, lng: -73.8448 },
    '11377': { displayName: "Woodside",               borough: "Queens",    lat: 40.7471, lng: -73.9047 },
    '11378': { displayName: "Maspeth",                borough: "Queens",    lat: 40.7219, lng: -73.9072 },
    '11379': { displayName: "Middle Village",         borough: "Queens",    lat: 40.7149, lng: -73.8771 },
    '11385': { displayName: "Glendale",               borough: "Queens",    lat: 40.7019, lng: -73.8810 },
    '11411': { displayName: "Cambria Heights",        borough: "Queens",    lat: 40.6942, lng: -73.7367 },
    '11412': { displayName: "St. Albans",             borough: "Queens",    lat: 40.6926, lng: -73.7582 },
    '11413': { displayName: "Springfield Gardens",    borough: "Queens",    lat: 40.6659, lng: -73.7541 },
    '11414': { displayName: "Howard Beach",           borough: "Queens",    lat: 40.6572, lng: -73.8434 },
    '11415': { displayName: "Kew Gardens",            borough: "Queens",    lat: 40.7103, lng: -73.8320 },
    '11416': { displayName: "Ozone Park",             borough: "Queens",    lat: 40.6830, lng: -73.8500 },
    '11417': { displayName: "Ozone Park",             borough: "Queens",    lat: 40.6742, lng: -73.8456 },
    '11418': { displayName: "Richmond Hill",          borough: "Queens",    lat: 40.6984, lng: -73.8342 },
    '11419': { displayName: "South Ozone Park",       borough: "Queens",    lat: 40.6823, lng: -73.8222 },
    '11420': { displayName: "South Ozone Park",       borough: "Queens",    lat: 40.6722, lng: -73.8074 },
    '11421': { displayName: "Woodhaven",              borough: "Queens",    lat: 40.6928, lng: -73.8556 },
    '11422': { displayName: "Rosedale",               borough: "Queens",    lat: 40.6620, lng: -73.7371 },
    '11423': { displayName: "Hollis",                 borough: "Queens",    lat: 40.7097, lng: -73.7678 },
    '11424': { displayName: "Jamaica",                borough: "Queens",    lat: 40.6921, lng: -73.7985 },
    '11425': { displayName: "Jamaica",                borough: "Queens",    lat: 40.7009, lng: -73.7809 },
    '11426': { displayName: "Bellerose",              borough: "Queens",    lat: 40.7399, lng: -73.7220 },
    '11427': { displayName: "Queens Village",         borough: "Queens",    lat: 40.7266, lng: -73.7430 },
    '11428': { displayName: "Queens Village",         borough: "Queens",    lat: 40.7186, lng: -73.7371 },
    '11429': { displayName: "Queens Village",         borough: "Queens",    lat: 40.7109, lng: -73.7308 },
    '11430': { displayName: "JFK Airport",            borough: "Queens",    lat: 40.6413, lng: -73.7781 },
    '11432': { displayName: "Jamaica",                borough: "Queens",    lat: 40.7126, lng: -73.8006 },
    '11433': { displayName: "Jamaica",                borough: "Queens",    lat: 40.6977, lng: -73.7836 },
    '11434': { displayName: "Jamaica",                borough: "Queens",    lat: 40.6715, lng: -73.7766 },
    '11435': { displayName: "Briarwood",              borough: "Queens",    lat: 40.7013, lng: -73.8133 },
    '11436': { displayName: "Jamaica",                borough: "Queens",    lat: 40.6769, lng: -73.8007 },
    // ── Bronx ────────────────────────────────────────────────────────────────
    '10451': { displayName: "Mott Haven",             borough: "Bronx",     lat: 40.8130, lng: -73.9224 },
    '10452': { displayName: "Highbridge",             borough: "Bronx",     lat: 40.8329, lng: -73.9245 },
    '10453': { displayName: "Morris Heights",         borough: "Bronx",     lat: 40.8513, lng: -73.9163 },
    '10454': { displayName: "Port Morris",            borough: "Bronx",     lat: 40.8057, lng: -73.9071 },
    '10455': { displayName: "Mott Haven",             borough: "Bronx",     lat: 40.8129, lng: -73.9028 },
    '10456': { displayName: "Morrisania",             borough: "Bronx",     lat: 40.8270, lng: -73.9080 },
    '10457': { displayName: "East Tremont",           borough: "Bronx",     lat: 40.8467, lng: -73.8959 },
    '10458': { displayName: "Belmont",                borough: "Bronx",     lat: 40.8581, lng: -73.8927 },
    '10459': { displayName: "Longwood",               borough: "Bronx",     lat: 40.8208, lng: -73.8948 },
    '10460': { displayName: "West Farms",             borough: "Bronx",     lat: 40.8384, lng: -73.8794 },
    '10461': { displayName: "Parkchester",            borough: "Bronx",     lat: 40.8387, lng: -73.8573 },
    '10462': { displayName: "Westchester Square",     borough: "Bronx",     lat: 40.8410, lng: -73.8514 },
    '10463': { displayName: "Kingsbridge",            borough: "Bronx",     lat: 40.8775, lng: -73.9097 },
    '10464': { displayName: "City Island",            borough: "Bronx",     lat: 40.8472, lng: -73.7867 },
    '10465': { displayName: "Throggs Neck",           borough: "Bronx",     lat: 40.8198, lng: -73.8264 },
    '10466': { displayName: "Wakefield",              borough: "Bronx",     lat: 40.8940, lng: -73.8465 },
    '10467': { displayName: "Norwood",                borough: "Bronx",     lat: 40.8735, lng: -73.8803 },
    '10468': { displayName: "Fordham",                borough: "Bronx",     lat: 40.8617, lng: -73.9068 },
    '10469': { displayName: "Pelham Gardens",         borough: "Bronx",     lat: 40.8677, lng: -73.8520 },
    '10470': { displayName: "Woodlawn",               borough: "Bronx",     lat: 40.8948, lng: -73.8672 },
    '10471': { displayName: "Riverdale",              borough: "Bronx",     lat: 40.9006, lng: -73.9171 },
    '10472': { displayName: "Soundview",              borough: "Bronx",     lat: 40.8251, lng: -73.8676 },
    '10473': { displayName: "Soundview",              borough: "Bronx",     lat: 40.8178, lng: -73.8566 },
    '10474': { displayName: "Hunts Point",            borough: "Bronx",     lat: 40.8139, lng: -73.8873 },
    '10475': { displayName: "Co-op City",             borough: "Bronx",     lat: 40.8741, lng: -73.8279 },
    // ── Staten Island ────────────────────────────────────────────────────────
    '10301': { displayName: "St. George",             borough: "Staten Island", lat: 40.6437, lng: -74.0776 },
    '10302': { displayName: "Port Richmond",          borough: "Staten Island", lat: 40.6309, lng: -74.1355 },
    '10303': { displayName: "Mariners Harbor",        borough: "Staten Island", lat: 40.6292, lng: -74.1641 },
    '10304': { displayName: "Stapleton",              borough: "Staten Island", lat: 40.6210, lng: -74.0902 },
    '10305': { displayName: "Rosebank",               borough: "Staten Island", lat: 40.6057, lng: -74.0706 },
    '10306': { displayName: "New Dorp",               borough: "Staten Island", lat: 40.5742, lng: -74.1132 },
    '10307': { displayName: "Tottenville",            borough: "Staten Island", lat: 40.5100, lng: -74.2490 },
    '10308': { displayName: "Great Kills",            borough: "Staten Island", lat: 40.5527, lng: -74.1512 },
    '10309': { displayName: "Rossville",              borough: "Staten Island", lat: 40.5265, lng: -74.2056 },
    '10310': { displayName: "West Brighton",          borough: "Staten Island", lat: 40.6336, lng: -74.1187 },
    '10312': { displayName: "Eltingville",            borough: "Staten Island", lat: 40.5448, lng: -74.1784 },
    '10314': { displayName: "Willowbrook",            borough: "Staten Island", lat: 40.5966, lng: -74.1641 },
};

const INTERESTS = [
    { id: 'construction', label: 'Construction & Permits', icon: '🏗' },
    { id: 'transit',      label: 'Transit & Commute',      icon: '🚇' },
    { id: 'noise',        label: 'Noise & 311 Complaints', icon: '📢' },
    { id: 'lease',        label: 'Lease & Building Safety',icon: '🏢' },
    { id: 'growth',       label: 'Neighborhood Growth',    icon: '📈' },
    { id: 'demolitions',  label: 'Demolitions & Change',   icon: '⚠️' },
];

const SYNTHESIS_STEPS = [
    { text: 'Connecting to NYC Open Data…',       duration: 600 },
    { text: 'Querying DOB permit issuance…',       duration: 700 },
    { text: 'Pulling 311 noise complaints…',       duration: 650 },
    { text: 'Analyzing transit reliability…',      duration: 600 },
    { text: 'Cross-referencing HPD violations…',   duration: 700 },
    { text: 'Synthesizing block intelligence…',    duration: 800 },
    { text: 'Calibrating your brief…',             duration: 500 },
];

type Stage = 'logo' | 'input' | 'interests' | 'synthesis' | 'done';

export default function OnboardPage() {
    const router = useRouter();
    const { setProfile, isOnboarded } = useNeighborhood();

    const [stage, setStage] = useState<Stage>('logo');
    const [zip, setZip] = useState('');
    const [zipError, setZipError] = useState('');
    const [resolvedLocation, setResolvedLocation] = useState<typeof ZIP_MAP[string] | null>(null);
    const [selectedInterests, setSelectedInterests] = useState<string[]>(['transit', 'construction']);
    const [synthesisStep, setSynthesisStep] = useState(0);
    const [synthesisDone, setSynthesisDone] = useState(false);
    const inputRef = useRef<HTMLInputElement>(null);

    // If already onboarded, go straight to the brief
    useEffect(() => {
        if (isOnboarded) router.replace('/');
    }, [isOnboarded, router]);

    // Logo stage → input stage after animation completes
    useEffect(() => {
        if (stage !== 'logo') return;
        const t = setTimeout(() => setStage('input'), 2800);
        return () => clearTimeout(t);
    }, [stage]);

    // Auto-focus input when stage becomes 'input'
    useEffect(() => {
        if (stage === 'input') setTimeout(() => inputRef.current?.focus(), 100);
    }, [stage]);

    // Synthesis step ticker
    useEffect(() => {
        if (stage !== 'synthesis') return;
        let step = 0;
        let total = 0;

        function tick() {
            if (step >= SYNTHESIS_STEPS.length) {
                setSynthesisDone(true);
                setTimeout(() => setStage('done'), 600);
                return;
            }
            setSynthesisStep(step);
            total += SYNTHESIS_STEPS[step].duration;
            step++;
            setTimeout(tick, SYNTHESIS_STEPS[step - 1]?.duration ?? 600);
        }
        tick();
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [stage]);

    // When stage = done, write profile and redirect
    useEffect(() => {
        if (stage !== 'done' || !resolvedLocation) return;
        const profile: NeighborhoodProfile = {
            displayName: resolvedLocation.displayName,
            borough: resolvedLocation.borough,
            zip,
            rawInput: zip,
            lat: resolvedLocation.lat,
            lng: resolvedLocation.lng,
            interests: selectedInterests,
            onboardedAt: new Date().toISOString(),
        };
        setProfile(profile);
        router.replace('/');
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [stage]);

    function handleZipSubmit() {
        const clean = zip.trim().replace(/\D/g, '').slice(0, 5);
        const loc = ZIP_MAP[clean];
        if (!loc) {
            setZipError('ZIP not found in our NYC database. Try another ZIP or a neighborhood name.');
            return;
        }
        setZipError('');
        setResolvedLocation(loc);
        setStage('interests');
    }

    function toggleInterest(id: string) {
        setSelectedInterests(prev =>
            prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
        );
    }

    // ── Render ───────────────────────────────────────────────────────────────

    return (
        <div className="fixed inset-0 bg-[#09090b] flex flex-col items-center justify-center z-[100] overflow-hidden">

            {/* ── STAGE: Logo animation ── */}
            {stage === 'logo' && (
                <div className="flex flex-col items-center gap-6 animate-fade-in">
                    <LedeLogo animated />
                    <p className="text-[10px] font-mono tracking-[0.25em] text-zinc-600 uppercase">
                        Initializing…
                    </p>
                </div>
            )}

            {/* ── STAGE: ZIP input ── */}
            {stage === 'input' && (
                <div className="w-full max-w-[380px] px-6 flex flex-col gap-8 animate-slide-up">
                    <div className="flex flex-col gap-2">
                        <LedeLogo />
                        <p className="text-zinc-400 text-sm leading-relaxed mt-2">
                            NYC's autonomous civic intelligence.<br />
                            Enter your ZIP to initialize your brief.
                        </p>
                    </div>

                    <div className="flex flex-col gap-3">
                        <label className="text-[10px] font-mono tracking-[0.15em] text-zinc-500 uppercase">
                            Your ZIP code or neighborhood
                        </label>
                        <input
                            ref={inputRef}
                            type="text"
                            inputMode="numeric"
                            value={zip}
                            onChange={e => { setZip(e.target.value); setZipError(''); }}
                            onKeyDown={e => e.key === 'Enter' && handleZipSubmit()}
                            placeholder="e.g. 10036 or 11211"
                            className="w-full bg-zinc-900 border border-zinc-700 focus:border-emerald-500 text-white placeholder-zinc-600 rounded-xl px-4 py-3.5 text-base font-mono tracking-wider focus:outline-none transition-colors"
                        />
                        {zipError && (
                            <p className="text-rose-400 text-xs font-mono">{zipError}</p>
                        )}
                        <button
                            onClick={handleZipSubmit}
                            disabled={zip.trim().length < 4}
                            className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:bg-zinc-800 disabled:text-zinc-600 text-zinc-950 font-bold py-3.5 rounded-xl text-sm transition-colors"
                        >
                            Initialize My Block →
                        </button>
                    </div>

                    {/* Quick picks */}
                    <div className="flex flex-col gap-2">
                        <p className="text-[10px] font-mono text-zinc-600 uppercase tracking-widest">Quick pick</p>
                        <div className="flex flex-wrap gap-2">
                            {['10036 · Hell\'s Kitchen', '11211 · Williamsburg', '11101 · LIC', '10451 · Mott Haven', '10301 · St. George'].map(opt => {
                                const [z] = opt.split(' · ');
                                return (
                                    <button
                                        key={z}
                                        onClick={() => { setZip(z); setZipError(''); }}
                                        className="text-xs text-zinc-400 border border-zinc-800 hover:border-zinc-600 px-3 py-1.5 rounded-lg transition-colors font-mono"
                                    >
                                        {opt}
                                    </button>
                                );
                            })}
                        </div>
                    </div>
                </div>
            )}

            {/* ── STAGE: Interests ── */}
            {stage === 'interests' && resolvedLocation && (
                <div className="w-full max-w-[380px] px-6 flex flex-col gap-6 animate-slide-up">
                    <div>
                        <p className="text-[10px] font-mono tracking-[0.15em] text-emerald-400 uppercase mb-1">
                            Signal acquired ·{' '}
                            <span className="text-zinc-400">{resolvedLocation.displayName}, {resolvedLocation.borough}</span>
                        </p>
                        <h2 className="text-2xl font-bold text-white leading-tight">
                            What matters to you most?
                        </h2>
                        <p className="text-zinc-500 text-sm mt-1">
                            Your brief surfaces the signals you care about first.
                        </p>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                        {INTERESTS.map(({ id, label, icon }) => {
                            const active = selectedInterests.includes(id);
                            return (
                                <button
                                    key={id}
                                    onClick={() => toggleInterest(id)}
                                    className={`flex items-center gap-2.5 px-3 py-3 rounded-xl border text-left transition-all ${active
                                        ? 'bg-emerald-500/10 border-emerald-500/40 text-white'
                                        : 'bg-zinc-900/50 border-zinc-800 text-zinc-400 hover:border-zinc-600'
                                    }`}
                                >
                                    <span className="text-lg leading-none">{icon}</span>
                                    <span className="text-xs font-semibold leading-tight">{label}</span>
                                </button>
                            );
                        })}
                    </div>

                    <button
                        onClick={() => setStage('synthesis')}
                        disabled={selectedInterests.length === 0}
                        className="w-full bg-emerald-500 hover:bg-emerald-400 disabled:bg-zinc-800 disabled:text-zinc-600 text-zinc-950 font-bold py-3.5 rounded-xl text-sm transition-colors"
                    >
                        Build My Brief →
                    </button>
                </div>
            )}

            {/* ── STAGE: Synthesis ── */}
            {stage === 'synthesis' && (
                <div className="w-full max-w-[380px] px-6 flex flex-col gap-8 animate-fade-in">
                    <LedeLogo />

                    {/* Bento skeleton */}
                    <div className="flex flex-col gap-3">
                        {/* Daily brief skeleton */}
                        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 flex flex-col gap-2.5">
                            <div className="flex items-center justify-between">
                                <div className="h-2.5 bg-zinc-800 rounded-full w-24 animate-pulse" />
                                <div className="h-2 bg-zinc-800 rounded-full w-16 animate-pulse" />
                            </div>
                            <div className="h-3 bg-zinc-800 rounded-full w-full animate-pulse" />
                            <div className="h-3 bg-zinc-800 rounded-full w-4/5 animate-pulse" />
                            <div className="h-3 bg-zinc-800 rounded-full w-3/5 animate-pulse" />
                        </div>
                        {/* Two column skeleton */}
                        <div className="grid grid-cols-2 gap-3">
                            {[1, 2].map(i => (
                                <div key={i} className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-3 flex flex-col gap-2">
                                    <div className="h-2 bg-zinc-800 rounded-full w-16 animate-pulse" />
                                    <div className="h-8 bg-zinc-800 rounded animate-pulse" />
                                    <div className="h-2 bg-zinc-800 rounded-full w-12 animate-pulse" />
                                </div>
                            ))}
                        </div>
                        {/* Card skeleton */}
                        <div className="rounded-xl border border-zinc-800 bg-zinc-900/40 p-4 flex flex-col gap-2">
                            <div className="h-2 bg-zinc-800 rounded-full w-20 animate-pulse" />
                            <div className="h-4 bg-zinc-800 rounded-full w-full animate-pulse" />
                            <div className="h-4 bg-zinc-800 rounded-full w-3/4 animate-pulse" />
                        </div>
                    </div>

                    {/* Status line */}
                    <div className="flex items-center gap-3">
                        <span className={`w-2 h-2 rounded-full shrink-0 transition-colors ${synthesisDone ? 'bg-emerald-400' : 'bg-emerald-400 animate-pulse'}`} />
                        <span className="text-xs font-mono text-zinc-400 transition-all">
                            {synthesisDone ? 'Brief ready.' : SYNTHESIS_STEPS[synthesisStep]?.text}
                        </span>
                    </div>

                    {/* Progress bar */}
                    <div className="h-0.5 bg-zinc-800 rounded-full overflow-hidden -mt-4">
                        <div
                            className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                            style={{ width: `${((synthesisStep + 1) / SYNTHESIS_STEPS.length) * 100}%` }}
                        />
                    </div>
                </div>
            )}
        </div>
    );
}
