const https = require('https');
const fs = require('fs');
const path = require('path');

const url = 'https://github-contributions.vercel.app/api/v1/wajihacodeofficial';

https.get(url, (res) => {
    let body = '';
    res.on('data', chunk => body += chunk);
    res.on('end', () => {
        const data = JSON.parse(body);
        
        // We only want the last ~280 days (40 weeks) so it fits beautifully
        let allDays = data.contributions;
        
        // Filter out future days (it sometimes returns days ahead of today as 0)
        // Actually, just sort by date
        allDays.sort((a, b) => new Date(a.date) - new Date(b.date));
        
        // We want the last 280 days (approx 40 weeks * 7 days)
        const daysToKeep = 40 * 7;
        const recentDays = allDays.slice(-daysToKeep);
        
        // To build the matrix:
        // By default, recent days are at the bottom-right of an isometric grid.
        // User asked to "make the angle 180", effectively looking from the other side.
        // We can achieve a 180 degree rotation simply by reversing the X and Y coordinates mapping,
        // or by mapping newer dates to c=0 and older dates to c=cols.
        
        const cols = 40;
        const rows = 7;
        const w = 15;  
        const d = 8;   
        const gapX = 3; 
        const gapY = 3; 
        const width = 1200;
        const height = 500;

        const palette = [
            { top: '#301838', left: '#241029', right: '#1c0c20' }, // level 0 
            { top: '#a350a8', left: '#8a408c', right: '#6b306b' }, // level 1 
            { top: '#ff8ae6', left: '#d96fc0', right: '#b0599a' }, // level 2 
            { top: '#f52271', left: '#c41959', right: '#9e1245' }, // level 3 
            { top: '#0ce8e8', left: '#0abfbf', right: '#089696' }  // level 4 
        ];

        const blocks = [];
        for (let i = 0; i < recentDays.length; i++) {
            const day = recentDays[i];
            const weight = parseInt(day.intensity); // 0 to 4
            
            // Map 1D index to 2D grid
            // Standard: c = week (0 to 39), r = day of week (0 to 6)
            let raw_c = Math.floor(i / 7);
            let raw_r = i % 7;
            
            // 180 DEGREE ROTATION (opposite chronological flow)
            // Instead of going left-to-right, we go right-to-left AND bottom-to-top!
            let c = (cols - 1) - raw_c;
            let r = (rows - 1) - raw_r;

            let h = weight === 0 ? 4 : weight * 16 + (Math.random() * 5); // Add slight random variation
            
            let cx = width / 2 + 50 + (c - r) * (w + gapX);
            let cy = 100 + (c + r) * (d + gapY);
            
            blocks.push({ c, r, cx, cy, h, weight, date: day.date });
        }

        // Z-index sort for isometric rendering (back to front)
        blocks.sort((a, b) => (a.c + a.r) - (b.c + b.r));

        let svg = `<svg width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" xmlns="http://www.w3.org/2000/svg">\n`;
        svg += `<style>
            @keyframes float { 0%, 100% { transform: translateY(0px); } 50% { transform: translateY(-10px); } }
            @keyframes pulse { 0%, 100% { fill-opacity: 1; } 50% { fill-opacity: 0.6; } }
            .neon { animation: pulse 3s infinite alternate; }
            .matrix { animation: float 6s ease-in-out infinite; transform-origin: center; }
        </style>\n`;

        svg += `<rect width="100%" height="100%" fill="#0D1117" />\n`;
        svg += `<g class="matrix">\n`;

        for (let b of blocks) {
            const { cx, cy, h, weight } = b;
            const colors = palette[weight];
            
            const topPts = `${cx},${cy - h - d} ${cx + w},${cy - h} ${cx},${cy - h + d} ${cx - w},${cy - h}`;
            const leftPts = `${cx - w},${cy - h} ${cx},${cy - h + d} ${cx},${cy + d} ${cx - w},${cy}`;
            const rightPts = `${cx + w},${cy - h} ${cx},${cy - h + d} ${cx},${cy + d} ${cx + w},${cy}`;
            
            const extraClass = weight === 4 ? `class="neon"` : ``;

            svg += `<g>\n`;
            svg += `<polygon points="${leftPts}" fill="${colors.left}" />\n`;
            svg += `<polygon points="${rightPts}" fill="${colors.right}" />\n`;
            svg += `<polygon points="${topPts}" fill="${colors.top}" ${extraClass} stroke="#0D1117" stroke-width="0.5" />\n`;
            svg += `</g>\n`;
        }

        for (let i = 0; i < 50; i++) {
            const sx = Math.random() * width;
            const sy = Math.random() * height;
            const sColor = Math.random() > 0.5 ? '#ff8ae6' : '#0ce8e8';
            const sDelay = Math.random() * 5;
            svg += `<circle cx="${sx}" cy="${sy}" r="${Math.random() * 3 + 1.5}" fill="${sColor}" style="animation: pulse ${Math.random()*2 + 1}s infinite alternate; animation-delay: ${sDelay}s;" opacity="0.6"/>\n`;
        }

        svg += `</g></svg>`;

        fs.writeFileSync(path.join(__dirname, 'assets', '3d_matrix.svg'), svg);
        console.log('Successfully fetched REAL contribution data and generated the 180-degree reversed 3D Matrix!');
    });
}).on('error', (err) => {
    console.error('Failed to fetch contributions:', err.message);
});
