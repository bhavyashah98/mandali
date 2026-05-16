const fs = require('fs');
const path = require('path');

const BLINK_SYMBOL_COLORS = {
    1: '#dc2626', 2: '#3b82f6', 3: '#facc15', 4: '#f59e0b', 5: '#10b981',
    6: '#4b5563', 7: '#ec4899', 8: '#ef4444', 9: '#f97316', 10: '#be123c',
    11: '#6366f1', 12: '#0ea5e9', 13: '#64748b', 14: '#d97706', 15: '#fbbf24',
    16: '#06b6d4', 17: '#1c1917', 18: '#eab308', 19: '#f97316', 20: '#ef4444',
    21: '#d946ef', 22: '#10b981', 23: '#94a3b8', 24: '#8b5cf6', 25: '#1e293b',
    26: '#14b8a6', 27: '#e11d48', 28: '#8b5cf6', 29: '#f43f5e', 30: '#6366f1',
    31: '#f59e0b', 32: '#facc15', 33: '#22c55e', 34: '#3f6212', 35: '#ef4444',
    36: '#64748b', 37: '#1e3a8a', 38: '#db2777', 39: '#10b981', 40: '#f97316',
    41: '#0ea5e9', 42: '#a8a29e', 43: '#6366f1', 44: '#fde047', 45: '#0284c7',
    46: '#eab308', 47: '#38bdf8', 48: '#8b5cf6', 49: '#facc15', 50: '#f59e0b',
    51: '#15803d', 52: '#14b8a6', 53: '#fbbf24', 54: '#22c55e', 55: '#d946ef',
    56: '#475569', 57: '#eab308',
};

const FILENAMES = {
    1: 'apple.svg', 2: 'balloon.svg', 3: 'banana.svg', 4: 'bell.svg', 5: 'bike.svg',
    6: 'camera.svg', 7: 'candy.svg', 8: 'car.svg', 9: 'cat.svg', 10: 'cherry.svg',
    11: 'circle.svg', 12: 'cloud-drizzle.svg', 13: 'compass.svg', 14: 'cookie.svg', 15: 'crown.svg',
    16: 'diamond.svg', 17: 'dices.svg', 18: 'drum.svg', 19: 'fish.svg', 20: 'flame.svg',
    21: 'flower-2.svg', 22: 'gamepad.svg', 23: 'ghost.svg', 24: 'gift.svg', 25: 'glasses.svg',
    26: 'headphones.svg', 27: 'heart.svg', 28: 'hexagon.svg', 29: 'ice-cream-cone.svg', 30: 'infinity.svg',
    31: 'key.svg', 32: 'lamp.svg', 33: 'leafy-green.svg', 34: 'lock.svg', 35: 'magnet.svg',
    36: 'mic.svg', 37: 'moon.svg', 38: 'music.svg', 39: 'party-popper.svg', 40: 'pizza.svg',
    41: 'plane.svg', 42: 'rabbit.svg', 43: 'rocket.svg', 44: 'shell.svg', 45: 'ship.svg',
    46: 'smile.svg', 47: 'snowflake.svg', 48: 'square.svg', 49: 'star.svg', 50: 'sun.svg',
    51: 'tree-pine.svg', 52: 'triangle.svg', 53: 'trophy.svg', 54: 'turtle.svg', 55: 'umbrella.svg',
    56: 'watch.svg', 57: 'zap.svg'
};

const dir = path.join(__dirname, 'app', 'assets', 'blink', 'themes', 'default');

for (let id = 1; id <= 57; id++) {
    const filename = FILENAMES[id];
    const color = BLINK_SYMBOL_COLORS[id];
    const filepath = path.join(dir, filename);
    
    if (fs.existsSync(filepath)) {
        let content = fs.readFileSync(filepath, 'utf8');
        
        // Ensure stroke and fill are updated.
        // Some might already have been modified, so use regex
        content = content.replace(/fill="[^"]*"/, `fill="${color}"`);
        content = content.replace(/stroke="[^"]*"/, `stroke="#0f172a"`);
        content = content.replace(/stroke-width="[^"]*"/, `stroke-width="2"`);
        
        fs.writeFileSync(filepath, content, 'utf8');
        console.log(`Updated ${filename} with color ${color}`);
    } else {
        console.log(`Missing ${filename}`);
    }
}
