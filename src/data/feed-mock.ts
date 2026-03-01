import type { LedeCardData } from '@/types';

export const feedMock: LedeCardData[] = [
    {
        category: 'Housing',
        emoji: '🏡',
        accentColor: 'emerald',
        headline: 'Big Building Boom in Early February!',
        bullets: [
            'We saw a huge jump in new buildings! 34 new projects started the first week of February across the city.',
            'Demolitions are keeping quiet. Only 1 old building came down per week this month.',
            'Things slowed down a bit later in the month, returning to a normal level of 18–28 new projects per week.',
        ],
        timestamp: '2026-02-28T08:00:00Z',
        sqlQuery: "SELECT DATE(issue_date), COUNT(*) FROM civicdata.dob_permits WHERE job_type = 'NB' GROUP BY 1 ORDER BY 1 DESC LIMIT 30",
        trend: [18, 22, 34, 34, 28, 20, 19, 18, 22, 24],
    },
    {
        category: 'Noise',
        emoji: '🔊',
        accentColor: 'amber',
        headline: 'Loud Music Complaints Spike Near 10th Ave',
        bullets: [
            '311 noise complaints in Hell\'s Kitchen jumped 38% this week vs the 90-day average.',
            'Most calls came from the 500–600 block of 10th Ave between 11PM and 2AM.',
            'This pattern has appeared consistently on Friday and Saturday nights for 6 weeks.',
        ],
        timestamp: '2026-02-28T07:30:00Z',
        sqlQuery: "SELECT DATE(created_date), COUNT(*) FROM civicdata.311_requests WHERE complaint_type = 'Noise - Residential' AND zip_code = '10018' GROUP BY 1 ORDER BY 1 DESC",
        trend: [22, 24, 26, 28, 31, 35, 38, 36, 40, 52],
    },
    {
        category: 'Transit',
        emoji: '🚇',
        accentColor: 'sky',
        headline: 'A/C/E Lines Running at 94% Reliability This Week',
        bullets: [
            'The A, C, and E trains serving Hell\'s Kitchen are performing above the citywide average of 88%.',
            'One signal delay on Tuesday caused a 12-minute gap on the A train during the evening rush.',
            'Weekend service changes are in effect Saturday night for track work between 42nd and 59th St.',
        ],
        timestamp: '2026-02-28T07:00:00Z',
        trend: [88, 91, 89, 92, 94, 90, 88, 93, 94, 94],
    },
    {
        category: 'Infrastructure',
        emoji: '🏗️',
        accentColor: 'violet',
        headline: '3 Active Scaffolds in Your Block — One Since 2022',
        bullets: [
            '437 West 46th St has had a sidewalk scaffold in place for 843 days — a DOB permit violation.',
            'A new scaffold was installed at 461 West 47th St this week for a 6-month facade restoration.',
            'One scaffold at 505 West 45th St is scheduled for removal by March 15.',
        ],
        timestamp: '2026-02-28T06:45:00Z',
        trend: [2, 2, 3, 3, 3, 3, 2, 3, 3, 3],
    },
    {
        category: 'Civic',
        emoji: '🏛️',
        accentColor: 'rose',
        headline: 'Community Board 4 Votes on New Zoning Variance Tonight',
        bullets: [
            'CB4 meets at 6:30 PM today at 330 West 42nd St to vote on a zoning variance for a mixed-use tower.',
            'The proposed 38-story building at 525 West 46th St would bring 240 units, 30% affordable.',
            'Residents can submit testimony by email before 5 PM — contact@cb4nyc.org.',
        ],
        timestamp: '2026-02-28T06:00:00Z',
    },
];

export const dailyBrief = {
    summary: "Hell's Kitchen is seeing a construction surge heading into spring — new building permits are up sharply, but a handful of long-stalled scaffolds are quietly breaking the law. Meanwhile, the A/C/E lines are holding strong, and tonight's CB4 meeting could reshape the block at 46th and 10th. Keep an eye on that noise pattern near 10th Ave — 6 straight weeks of Friday spikes suggest it's not going away on its own.",
    timestamp: '2026-02-28T08:00:00Z',
};
