import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Zap, 
  Wind, 
  Coins, 
  Trophy, 
  Sparkles, 
  Ghost, 
  Flame, 
  Droplet, 
  Skull, 
  Bug, 
  Leaf, 
  Brush, 
  Maximize, 
  Package,
  Target,
  Cpu,
  MousePointer2,
  Activity,
  Settings,
  Trash2,
  Database,
  ChevronRight
} from 'lucide-react';
import { cn } from './lib/utils';

const GRID_SIZE = 8;
const TOTAL_TILES = GRID_SIZE * GRID_SIZE;

type Ability = {
  id: string;
  name: string;
  desc: string;
};

type EntityVariant = {
  name: string;
  hpMult: number;
  rewardCoinsMult: number;
  color: string;
};

type EntityType = {
  id: string;
  name: string;
  icon: React.ElementType;
  color: string;
  glow: string;
  hpMult: number;
  rewardCoins: number;
  rewardEssence: string;
  chance: number;
  lore: string;
  minLevel: number;
  variants?: EntityVariant[];
  abilities?: Ability[];
};

const ENTITIES: EntityType[] = [
  { 
    id: 'mite', name: 'Dust Mite', icon: Bug, color: 'text-stone-400', glow: 'shadow-stone-500/20', hpMult: 0.4, rewardCoins: 1, rewardEssence: 'Dust', chance: 0.4, lore: 'Tiny scavengers that feed on the cosmic dust of the sector.', minLevel: 0,
    abilities: [{ id: 'scuttle', name: 'Scuttle', desc: 'Moves quickly when attacked.' }]
  },
  { 
    id: 'slime', name: 'Slime', icon: Droplet, color: 'text-emerald-400', glow: 'shadow-emerald-500/50', hpMult: 1, rewardCoins: 3, rewardEssence: 'Slime Essence', chance: 0.3, lore: 'Gelatinous organisms that pulsate with a faint bio-luminescence.', minLevel: 0,
    variants: [{ name: 'Armored Slime', hpMult: 2, rewardCoinsMult: 1.5, color: 'text-emerald-600' }],
    abilities: [{ id: 'split', name: 'Split', desc: 'Splits into smaller slimes on death.' }]
  },
  { 
    id: 'ember', name: 'Ember Spirit', icon: Flame, color: 'text-orange-400', glow: 'shadow-orange-500/50', hpMult: 2.5, rewardCoins: 10, rewardEssence: 'Fire Essence', chance: 0.15, lore: 'Fragments of a dying star, still burning with intense heat.', minLevel: 3,
    variants: [{ name: 'Volatile Ember Spirit', hpMult: 1.5, rewardCoinsMult: 2, color: 'text-red-500' }],
    abilities: [{ id: 'explode', name: 'Explode', desc: 'Explodes on death, dealing damage to nearby tiles.' }]
  },
  { 
    id: 'wraith', name: 'Wraith', icon: Ghost, color: 'text-purple-400', glow: 'shadow-purple-500/50', hpMult: 6, rewardCoins: 35, rewardEssence: 'Void Essence', chance: 0.08, lore: 'Echoes of long-lost miners who wandered too deep into the void.', minLevel: 6 
  },
  { 
    id: 'dragon', name: 'Void Dragon', icon: Skull, color: 'text-rose-500', glow: 'shadow-rose-600/50', hpMult: 15, rewardCoins: 150, rewardEssence: 'Dragon Heart', chance: 0.05, lore: 'Ancient guardians of the sector, born from the collapse of a nebula.', minLevel: 10 
  },
  { 
    id: 'behemoth', name: 'Celestial Behemoth', icon: Sparkles, color: 'text-cyan-300', glow: 'shadow-cyan-400/70', hpMult: 40, rewardCoins: 800, rewardEssence: 'Celestial Shard', chance: 0.02, lore: 'A titan of pure energy, its presence warps the very fabric of space.', minLevel: 15 
  },
];

type Particle = {
  id: number;
  x: number;
  y: number;
  color: string;
  vx: number;
  vy: number;
};

type Collectible = {
  id: number;
  x: number;
  y: number;
  type: 'coin' | 'essence';
  name: string;
  value: number;
  vx: number;
  vy: number;
};

type Tile = {
  id: number;
  row: number;
  col: number;
  hp: number;
  maxHp: number;
  entity: EntityType | null;
  variant: EntityVariant | null;
  abilities: Ability[];
  lastHitTime: number;
  variation: number;
  hue: number;
  scale: number;
  rotation: number;
};

type GameState = {
  level: number;
  coins: number;
  clickLevel: number;
  sizeLevel: number;
  autoLevel: number;
  speedLevel: number;
  timeLevel: number; // New upgrade level
  droneSpeedLevel: number; // New upgrade level
  essence: Record<string, number>;
  discovered: string[];
  levelCoins: number;
  levelEssence: Record<string, number>;
  activeBuffs: Record<string, number>; // Buff name -> end time (ms)
  lowPerformanceMode: boolean;
};

const getBaseHp = (entityHpMult: number = 1) => {
  return 10 * entityHpMult;
};

const generateLevel = (level: number): Tile[] => {
  const spawnDensity = 0.4 + Math.min(level * 0.02, 0.3);
  const availableEntities = ENTITIES.filter(e => e.minLevel <= level);
  
  return Array.from({ length: TOTAL_TILES }).map((_, i) => {
    const row = Math.floor(i / GRID_SIZE);
    const col = i % GRID_SIZE;
    
    const hasEntity = Math.random() < spawnDensity;
    let selectedEntity: EntityType | null = null;
    let selectedVariant: EntityVariant | null = null;
    
    if (hasEntity) {
      const rand = Math.random();
      let cumulative = 0;
      const totalChance = availableEntities.reduce((sum, e) => sum + e.chance, 0);
      
      for (const ent of availableEntities) {
        cumulative += ent.chance / totalChance;
        if (rand < cumulative) {
          selectedEntity = ent;
          break;
        }
      }
      if (!selectedEntity) selectedEntity = availableEntities[0];

      if (selectedEntity.variants && Math.random() < 0.2) {
        selectedVariant = selectedEntity.variants[Math.floor(Math.random() * selectedEntity.variants.length)];
      }
    }
    
    const hpMult = (selectedEntity?.hpMult || 1) * (selectedVariant?.hpMult || 1);
    const hp = getBaseHp(hpMult);
    
    return {
      id: i,
      row,
      col,
      hp: selectedEntity ? hp : 0,
      maxHp: hp,
      entity: selectedEntity,
      variant: selectedVariant,
      abilities: selectedEntity?.abilities || [],
      lastHitTime: 0,
      variation: Math.random(),
      hue: (Math.random() - 0.5) * 40,
      scale: 0.85 + Math.random() * 0.3,
      rotation: (Math.random() - 0.5) * 15,
    };
  });
};

const UPGRADES = {
  click: {
    name: 'Pulse Laser',
    baseCost: 15,
    costMult: 1.3,
    basePower: 10,
    powerMult: 1.15,
    icon: Zap,
    desc: 'Mining power',
    unlockedBy: null
  },
  speed: {
    name: 'Attack Speed',
    baseCost: 50,
    costMult: 1.4,
    basePower: 1.2,
    powerMult: 0.96,
    icon: Wind,
    desc: 'Mining speed',
    unlockedBy: 'click'
  },
  size: {
    name: 'Beam Width',
    baseCost: 200,
    costMult: 2.5,
    basePower: 1,
    powerMult: 1,
    icon: Maximize,
    desc: 'Mining area',
    unlockedBy: 'speed'
  },
  auto: {
    name: 'Mining Drone',
    baseCost: 150,
    costMult: 1.5,
    basePower: 5,
    powerMult: 1.2,
    icon: Cpu,
    desc: 'Passive mining',
    unlockedBy: 'click'
  },
  time: {
    name: 'Sector Stabilizer',
    baseCost: 100,
    costMult: 1.4,
    basePower: 15,
    powerMult: 1.1,
    icon: Activity,
    desc: 'Sector time',
    unlockedBy: 'auto'
  },
  droneSpeed: {
    name: 'Drone Overclock',
    baseCost: 200,
    costMult: 1.5,
    basePower: 2.0,
    powerMult: 0.96,
    icon: Zap,
    desc: 'Drone speed',
    unlockedBy: 'auto'
  }
};

type UpgradeType = keyof typeof UPGRADES;

const getUpgradeCost = (type: UpgradeType, level: number) => {
  return Math.floor(UPGRADES[type].baseCost * Math.pow(UPGRADES[type].costMult, level));
};

const getUpgradePower = (type: UpgradeType, level: number) => {
  if (type === 'size') return 0.5 + (level * 0.25); // Starts at 0.5 radius (1 tile), grows by 0.25
  if (type === 'speed') {
    // Interval decreases: 1.5s -> 1.38s -> 1.27s ...
    return 1.5 * Math.pow(0.92, level);
  }
  if (type === 'time') return 10 + (level * 2); // 10s base + 2s per level
  if (type === 'droneSpeed') {
    // Drone interval: 2.0s -> 1.9s -> 1.8s ...
    return 2.0 * Math.pow(0.95, level);
  }
  if (level === 0 && type === 'auto') return 0;
  return UPGRADES[type].basePower * Math.pow(UPGRADES[type].powerMult, level === 0 ? 0 : level - 1);
};

const CRAFTING_RECIPES = [
  {
    id: 'overload',
    name: 'Laser Overload',
    desc: 'Double mining power for 30s',
    ingredients: { 'Dust': 10, 'Slime Essence': 5 },
    icon: Zap,
    buff: 'double_damage',
    duration: 30000
  },
  {
    id: 'haste',
    name: 'Temporal Haste',
    desc: 'Double attack speed for 30s',
    ingredients: { 'Fire Essence': 5, 'Slime Essence': 5 },
    icon: Wind,
    buff: 'double_speed',
    duration: 30000
  },
  {
    id: 'magnet',
    name: 'Essence Magnet',
    desc: 'Triple collection radius for 60s',
    ingredients: { 'Void Essence': 3, 'Dust': 20 },
    icon: Target,
    buff: 'triple_magnet',
    duration: 60000
  }
];

export default function App() {
  const [gameState, setGameState] = useState<GameState>(() => {
    const saved = localStorage.getItem('creature_miner_state');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        // Fix NaN issues and ensure defaults
        return {
          level: Number.isFinite(parsed.level) ? parsed.level : 0,
          coins: Number.isFinite(parsed.coins) ? parsed.coins : 0,
          clickLevel: Number.isFinite(parsed.clickLevel) ? parsed.clickLevel : 1,
          sizeLevel: Number.isFinite(parsed.sizeLevel) ? parsed.sizeLevel : 0,
          autoLevel: Number.isFinite(parsed.autoLevel) ? parsed.autoLevel : 0,
          speedLevel: Number.isFinite(parsed.speedLevel) ? parsed.speedLevel : 0,
          timeLevel: Number.isFinite(parsed.timeLevel) ? parsed.timeLevel : 0,
          droneSpeedLevel: Number.isFinite(parsed.droneSpeedLevel) ? parsed.droneSpeedLevel : 0,
          essence: parsed.essence || {},
          discovered: parsed.discovered || [],
          levelCoins: Number.isFinite(parsed.levelCoins) ? parsed.levelCoins : 0,
          levelEssence: parsed.levelEssence || {},
          activeBuffs: parsed.activeBuffs || {},
          lowPerformanceMode: parsed.lowPerformanceMode !== undefined ? parsed.lowPerformanceMode : true,
        };
      } catch (e) {
        console.error("Failed to parse saved state", e);
      }
    }
    return {
      level: 0,
      coins: 0,
      clickLevel: 1,
      sizeLevel: 0,
      autoLevel: 0,
      speedLevel: 0,
      timeLevel: 0,
      droneSpeedLevel: 0,
      essence: {},
      discovered: [],
      levelCoins: 0,
      levelEssence: {},
      activeBuffs: {},
      lowPerformanceMode: true,
    };
  });
  
  useEffect(() => {
    localStorage.setItem('creature_miner_state', JSON.stringify(gameState));
  }, [gameState]);

  useEffect(() => {
    if (Object.keys(gameState.activeBuffs).length > 0 && !gameState.lowPerformanceMode) {
      const interval = setInterval(() => {
        setParticles(p => [...p.slice(-100), {
          id: Math.random(),
          x: (Math.random() - 0.5) * GRID_SIZE * 40,
          y: (Math.random() - 0.5) * GRID_SIZE * 40,
          color: 'bg-yellow-400',
          vx: (Math.random() - 0.5) * 2,
          vy: (Math.random() - 0.5) * 2
        }]);
      }, 500);
      return () => clearInterval(interval);
    }
  }, [gameState.activeBuffs, gameState.lowPerformanceMode]);

  const [tiles, setTiles] = useState<Tile[]>(() => generateLevel(gameState.level));
  const [particles, setParticles] = useState<Particle[]>([]);
  const [collectibles, setCollectibles] = useState<Collectible[]>([]);
  const [showLevelComplete, setShowLevelComplete] = useState(false);
  const [showSkillTree, setShowSkillTree] = useState(false);
  const [showCodex, setShowCodex] = useState(false);
  const [showCrafting, setShowCrafting] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);
  const [newDiscovery, setNewDiscovery] = useState<string | null>(null);
  const [combo, setCombo] = useState(0);
  const [lastComboTime, setLastComboTime] = useState(0);
  const [sectorTime, setSectorTime] = useState(getUpgradePower('time', gameState.timeLevel));
  const [lastSwingTime, setLastSwingTime] = useState(0);
  const [swingPos, setSwingPos] = useState<{col: number, row: number} | null>(null);
  const [isMiningActive, setIsMiningActive] = useState(false);
  const [upgradeFlash, setUpgradeFlash] = useState<UpgradeType | null>(null);
  const [shake, setShake] = useState(0);
  const [distortion, setDistortion] = useState(0);
  const [lastAttackVisualTime, setLastAttackVisualTime] = useState(0);
  const [droneHits, setDroneHits] = useState<{id: number, droneId: number, tileId: number, time: number}[]>([]);
  
  const gridRef = useRef<HTMLDivElement>(null);
  const cursorCircleRef = useRef<HTMLDivElement>(null);
  const cooldownRingRef = useRef<SVGCircleElement>(null);
  const [hoveredTile, setHoveredTile] = useState<number | null>(null);
  const precisePosRef = useRef<{col: number, row: number} | null>(null);
  const lastTimeRef = useRef(performance.now());
  const lastAttackTimeRef = useRef(0);
  const particleIdRef = useRef(0);
  const collectibleIdRef = useRef(0);
  const droneHitIdRef = useRef(0);
  const droneTargetsRef = useRef<Record<number, number>>({});
  const droneTimersRef = useRef<Record<number, number>>({});
  const dronePositionsRef = useRef<Record<number, { x: number, y: number, z: number }>>({});
  const isMiningActiveRef = useRef(false);
  const pointerTypeRef = useRef<'mouse' | 'touch' | 'pen'>('mouse');
  
  // Game Loop
  useEffect(() => {
    let animationFrameId: number;
    
    const loop = (time: number) => {
      const dt = (time - lastTimeRef.current) / 1000;
      lastTimeRef.current = time;
      
      if (dt > 0.1) {
        animationFrameId = requestAnimationFrame(loop);
        return;
      }
      
      // Update Combo
      if (time - lastComboTime > 2000 && combo > 0) {
        setCombo(0);
      }

      // Update Buffs
      const now = Date.now();
      let buffsChanged = false;
      const newBuffs = { ...gameState.activeBuffs };
      Object.entries(newBuffs).forEach(([k, v]) => {
        if (now > (v as number)) {
          delete newBuffs[k];
          buffsChanged = true;
        }
      });
      if (buffsChanged) {
        setGameState(g => ({ ...g, activeBuffs: newBuffs }));
      }

      // Update Sector Timer
      if (!showLevelComplete && !showSkillTree && !showCrafting && !showCodex && !showSettings && !showResetConfirm && !newDiscovery) {
        setSectorTime(prev => {
          const next = prev - dt;
          if (next <= 0) {
            setShowLevelComplete(true);
            setDistortion(1);
            setTimeout(() => setDistortion(0), 1000);
            return 0;
          }
          return next;
        });
      }

      // Update Shake
      if (shake > 0) {
        setShake(prev => Math.max(0, prev - dt * 20));
      }

      // Update Cursor Visuals (Direct DOM for zero lag)
      const precisePos = precisePosRef.current;
      if (cursorCircleRef.current) {
        if (precisePos) {
          cursorCircleRef.current.style.opacity = '1';
          cursorCircleRef.current.style.left = `${precisePos.col * 40}px`;
          cursorCircleRef.current.style.top = `${precisePos.row * 40}px`;
          
          // Update Cooldown Ring
          if (cooldownRingRef.current) {
            let attackInterval = getUpgradePower('speed', gameState.speedLevel);
            if (gameState.activeBuffs['double_speed']) attackInterval /= 2;
            const progress = Math.min(100, ((time - lastAttackTimeRef.current) / (attackInterval * 1000)) * 100);
            cooldownRingRef.current.style.strokeDashoffset = `${100 - progress}`;
          }
        } else {
          cursorCircleRef.current.style.opacity = '0';
        }
      }

      // Update Particles
      setParticles(prev => prev
        .map(p => ({
          ...p,
          x: p.x + p.vx * dt * 100,
          y: p.y + p.vy * dt * 100,
          vy: p.vy + 0.5 * dt // Gravity
        }))
        .filter(p => p.y < 500 && p.x > -500 && p.x < 500)
      );

      // Update Collectibles
      setCollectibles(prev => {
        const precisePos = precisePosRef.current;
        const radius = getUpgradePower('size', gameState.sizeLevel) + 0.5;
        let coinsGained = 0;
        let essenceGained: Record<string, number> = {};
        
        const updated = prev.map(c => {
          // Move towards player if close
          let vx = c.vx;
          let vy = c.vy;
          let x = c.x + vx * dt * 100;
          let y = c.y + vy * dt * 100;
          
          if (precisePos) {
            const dx = (precisePos.col - GRID_SIZE/2) * 40 + 20 - x;
            const dy = (precisePos.row - GRID_SIZE/2) * 40 + 20 - y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            let magnetRadius = 100;
            if (gameState.activeBuffs['triple_magnet']) magnetRadius *= 3;
            if (dist < magnetRadius) {
              vx += (dx / dist) * 8 * dt; // Faster attraction
              vy += (dy / dist) * 8 * dt;
            }
          }
          
          return { ...c, x, y, vx: vx * 0.98, vy: vy * 0.98 };
        }).filter(c => {
          if (precisePos) {
            const dx = (precisePos.col - GRID_SIZE/2) * 40 + 20 - c.x;
            const dy = (precisePos.row - GRID_SIZE/2) * 40 + 20 - c.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            if (dist < 20) {
              if (c.type === 'coin') coinsGained += c.value;
              else essenceGained[c.name] = (essenceGained[c.name] || 0) + 1;
              return false;
            }
          }
          return true;
        });

        if (coinsGained > 0 || Object.keys(essenceGained).length > 0) {
          setGameState(g => {
            const newEssence = { ...g.essence };
            const newLevelEssence = { ...g.levelEssence };
            Object.entries(essenceGained).forEach(([k, v]) => {
              newEssence[k] = (newEssence[k] || 0) + v;
              newLevelEssence[k] = (newLevelEssence[k] || 0) + v;
            });
            return { 
              ...g, 
              coins: g.coins + coinsGained, 
              levelCoins: g.levelCoins + coinsGained,
              essence: newEssence,
              levelEssence: newLevelEssence
            };
          });
        }

        return updated;
      });

      setTiles(prevTiles => {
        let newTiles = [...prevTiles];
        let tilesChanged = false;
        let discovered: string[] = [];
        
        let attackInterval = getUpgradePower('speed', gameState.speedLevel);
        if (gameState.activeBuffs['double_speed']) attackInterval /= 2;
        const precisePos = precisePosRef.current;
        
        // Mining is active if:
        // 1. We have a target position (precisePos)
        // 2. AND no modals are open
        const active = precisePos !== null && 
          !showLevelComplete && !showSkillTree && !showCrafting && 
          !showCodex && !showSettings && !showResetConfirm && !newDiscovery;

        if (precisePos !== null && active && time - lastAttackTimeRef.current >= attackInterval * 1000) {
          lastAttackTimeRef.current = time;
          setLastSwingTime(time);
          setSwingPos({ ...precisePos });
          setLastAttackVisualTime(time);
          
          const hCol = precisePos.col;
          const hRow = precisePos.row;
          let damage = getUpgradePower('click', gameState.clickLevel);
          if (gameState.activeBuffs['double_damage']) damage *= 2;
          if (gameState.activeBuffs['power_boost']) damage *= 3;
          const radius = getUpgradePower('size', gameState.sizeLevel) + 0.5;
          
          newTiles.forEach(t => {
            if (t.hp > 0) {
              const dx = t.col + 0.5 - hCol;
              const dy = t.row + 0.5 - hRow;
              const dist = Math.sqrt(dx * dx + dy * dy);
              
              if (dist <= radius) {
                t.hp -= damage;
                t.lastHitTime = time;
                tilesChanged = true;
                setShake(5);
                setTimeout(() => setShake(0), 50);
                
                // Spawn particles
                if (!gameState.lowPerformanceMode) {
                  const color = t.entity?.color.replace('text-', 'bg-') || 'bg-stone-400';
                  for (let i = 0; i < 5; i++) {
                    const pId = particleIdRef.current++;
                    setParticles(p => [...p.slice(-100), {
                      id: pId,
                      x: (t.col - GRID_SIZE/2) * 40 + 20 + (Math.random() - 0.5) * 20,
                      y: (t.row - GRID_SIZE/2) * 40 + 20 + (Math.random() - 0.5) * 20,
                      color: color,
                      vx: (Math.random() - 0.5) * 6,
                      vy: (Math.random() - 0.5) * 6 - 3
                    }]);
                  }
                }

                if (t.hp <= 0) {
                  t.hp = 0;
                  setCombo(c => c + 1);
                  setLastComboTime(time);
                  if (t.entity) {
                    discovered.push(t.entity.id);
                    // Spawn Collectibles
                    const cId = collectibleIdRef.current++;
                    setCollectibles(prev => [...prev, 
                      {
                        id: cId,
                        x: (t.col - GRID_SIZE/2) * 40 + 20,
                        y: (t.row - GRID_SIZE/2) * 40 + 20,
                        type: 'coin',
                        name: 'Coins',
                        value: t.entity!.rewardCoins,
                        vx: (Math.random() - 0.5) * 2,
                        vy: (Math.random() - 0.5) * 2
                      },
                      {
                        id: collectibleIdRef.current++,
                        x: (t.col - GRID_SIZE/2) * 40 + 20,
                        y: (t.row - GRID_SIZE/2) * 40 + 20,
                        type: 'essence',
                        name: t.entity!.rewardEssence,
                        value: 1,
                        vx: (Math.random() - 0.5) * 2,
                        vy: (Math.random() - 0.5) * 2
                      }
                    ]);
                  }
                }
              }
            }
          });
        }
        
        if (discovered.length > 0) {
          setGameState(g => {
            const newlyDiscovered = discovered.filter(id => !g.discovered.includes(id));
            if (newlyDiscovered.length > 0) {
              setNewDiscovery(ENTITIES.find(e => e.id === newlyDiscovered[0])?.name || "New Creature");
              setTimeout(() => setNewDiscovery(null), 3000);
            }
            return {
              ...g,
              discovered: Array.from(new Set([...g.discovered, ...discovered]))
            };
          });
        }
        
        const autoPower = getUpgradePower('auto', gameState.autoLevel);
        if (autoPower > 0) {
          const droneCount = Math.min(gameState.autoLevel, 4);
          const droneInterval = getUpgradePower('droneSpeed', gameState.droneSpeedLevel);
          
          for (let d = 0; d < droneCount; d++) {
            // Initialize drone position if not exists
            if (!dronePositionsRef.current[d]) {
              const corners = [
                { x: -80, y: -80, z: 100 },
                { x: GRID_SIZE * 40 + 80, y: -80, z: 100 },
                { x: -80, y: GRID_SIZE * 40 + 80, z: 100 },
                { x: GRID_SIZE * 40 + 80, y: GRID_SIZE * 40 + 80, z: 100 }
              ];
              dronePositionsRef.current[d] = corners[d % 4];
            }

            // Check if drone has a valid target
            let targetId = droneTargetsRef.current[d];
            let targetTile = newTiles.find(t => t.id === targetId && t.hp > 0);
            
            // If no target or target dead, find new one
            if (!targetTile) {
              const activeTiles = newTiles.filter(t => t.hp > 0);
              if (activeTiles.length > 0) {
                // Pick a target that isn't heavily targeted if possible
                const targetCounts = Object.values(droneTargetsRef.current).reduce((acc, id) => {
                  const targetId = id as number;
                  acc[targetId] = (acc[targetId] || 0) + 1;
                  return acc;
                }, {} as Record<number, number>);
                
                // Prioritize lower health and fewer drones
                const sortedTiles = [...activeTiles].sort((a, b) => {
                  const scoreA = (targetCounts[a.id] || 0) * 2000 + (a.hp / a.maxHp) * 500;
                  const scoreB = (targetCounts[b.id] || 0) * 2000 + (b.hp / b.maxHp) * 500;
                  return scoreA - scoreB;
                });
                
                // Add some randomness
                const pool = sortedTiles.slice(0, Math.min(3, sortedTiles.length));
                targetTile = pool[Math.floor(Math.random() * pool.length)];
                droneTargetsRef.current[d] = targetTile.id;
              }
            }
            
            // Move drone towards target or hover
            const currentPos = dronePositionsRef.current[d];
            const targetX = targetTile ? (targetTile.col * 40 + 20) : currentPos.x;
            const targetY = targetTile ? (targetTile.row * 40 + 20) : currentPos.y;
            const targetZ = targetTile ? 40 : 100; // Hover height
            
            // Smooth movement
            const speed = 150; // pixels per second
            const dx = targetX - currentPos.x;
            const dy = targetY - currentPos.y;
            const dz = targetZ - currentPos.z;
            const dist2d = Math.sqrt(dx * dx + dy * dy);
            const dist3d = Math.sqrt(dx * dx + dy * dy + dz * dz);
            
            if (dist3d > 2) {
              const moveDist = Math.min(dist3d, speed * dt);
              currentPos.x += (dx / dist3d) * moveDist;
              currentPos.y += (dy / dist3d) * moveDist;
              currentPos.z += (dz / dist3d) * moveDist;
            }

            if (targetTile && dist2d < 60) {
              // Handle drone attack timer
              const lastDroneAttack = droneTimersRef.current[d] || 0;
              if (time - lastDroneAttack >= droneInterval * 1000) {
                const damage = autoPower / droneCount; // Damage per hit
                const index = newTiles.findIndex(t => t.id === targetTile!.id);
                if (index !== -1) {
                  newTiles[index].hp -= damage;
                  newTiles[index].lastHitTime = performance.now();
                  tilesChanged = true;
                  droneTimersRef.current[d] = time;
                  
                  // Visual feedback for drone hit
                  setDroneHits(prev => [...prev.filter(h => time - h.time < 1000).slice(-20), { id: droneHitIdRef.current++, droneId: d, tileId: targetTile!.id, time: time }]);
                  
                  // Small shake on hit
                  if (Math.random() > 0.8) setShake(prev => Math.min(5, prev + 1));

                  if (newTiles[index].hp <= 0) {
                    newTiles[index].hp = 0;
                    setShake(prev => Math.min(10, prev + 3));
                    if (newTiles[index].entity?.isBoss) {
                      setDistortion(1);
                      setTimeout(() => setDistortion(0), 1000);
                    }
                    if (newTiles[index].entity) {
                      discovered.push(newTiles[index].entity.id);
                      // Spawn Collectibles
                      const cId = collectibleIdRef.current++;
                      setCollectibles(prev => [...prev, 
                        {
                          id: cId,
                          x: (newTiles[index].col - GRID_SIZE/2) * 40 + 20,
                          y: (newTiles[index].row - GRID_SIZE/2) * 40 + 20,
                          type: 'coin',
                          name: 'Coins',
                          value: newTiles[index].entity!.rewardCoins,
                          vx: (Math.random() - 0.5) * 4,
                          vy: (Math.random() - 0.5) * 4
                        },
                        {
                          id: collectibleIdRef.current++,
                          x: (newTiles[index].col - GRID_SIZE/2) * 40 + 20,
                          y: (newTiles[index].row - GRID_SIZE/2) * 40 + 20,
                          type: 'essence',
                          name: newTiles[index].entity!.rewardEssence,
                          value: 1,
                          vx: (Math.random() - 0.5) * 4,
                          vy: (Math.random() - 0.5) * 4
                        }
                      ]);
                      
                      // Extra particles on break
                      for(let i=0; i<10; i++) {
                        setParticles(prev => [...prev.slice(-50), {
                          id: Math.random(),
                          x: (newTiles[index].col - GRID_SIZE/2) * 40 + 20,
                          y: (newTiles[index].row - GRID_SIZE/2) * 40 + 20,
                          vx: (Math.random() - 0.5) * 5,
                          vy: (Math.random() - 0.5) * 5,
                          color: newTiles[index].entity!.color.split('-')[1] || 'white'
                        }]);
                      }
                    }
                    // Clear target so drone picks new one next frame
                    delete droneTargetsRef.current[d];
                  }
                }
              }
            }
          }
        }
        
        if (tilesChanged && newTiles.every(t => t.hp <= 0)) {
          setShowLevelComplete(true);
          return newTiles;
        }
        
        return tilesChanged ? newTiles : prevTiles;
      });
      
      animationFrameId = requestAnimationFrame(loop);
    };
    
    animationFrameId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(animationFrameId);
  }, [gameState.clickLevel, gameState.autoLevel, gameState.sizeLevel, gameState.level, gameState.speedLevel, combo, lastComboTime, 
      showLevelComplete, showSkillTree, showCodex, showCrafting, showSettings, showResetConfirm, newDiscovery]);

  const activateBoost = () => {
    if (gameState.coins >= 2000 && !gameState.activeBuffs['power_boost']) {
      setGameState(g => ({
        ...g,
        coins: g.coins - 2000,
        activeBuffs: { ...g.activeBuffs, power_boost: performance.now() + 20000 }
      }));
    }
  };

  const togglePerformanceMode = () => {
    setGameState(g => ({ ...g, lowPerformanceMode: !g.lowPerformanceMode }));
  };

  const resetGame = () => {
    const initialState = {
      level: 0,
      coins: 0,
      clickLevel: 1,
      sizeLevel: 0,
      autoLevel: 0,
      speedLevel: 0,
      timeLevel: 0,
      droneSpeedLevel: 0,
      essence: {},
      discovered: [],
      levelCoins: 0,
      levelEssence: {},
      activeBuffs: {},
    };
    setGameState(initialState);
    setTiles(generateLevel(0));
    setSectorTime(getUpgradePower('time', 0));
    setShowLevelComplete(false);
    setShowSkillTree(false);
    setShowCrafting(false);
    setShowCodex(false);
    setShowSettings(false);
    setShowResetConfirm(false);
  };

  const nextLevel = () => {
    const newLevel = gameState.level + 1;
    setGameState(g => ({ ...g, level: newLevel, levelCoins: 0, levelEssence: {} }));
    setTiles(generateLevel(newLevel));
    setSectorTime(getUpgradePower('time', gameState.timeLevel));
    setShowLevelComplete(false);
    setShowSkillTree(false);
    setShowCrafting(false);
    setShowSettings(false);
  };

  const buyUpgrade = (type: UpgradeType) => {
    const level = gameState[`${type}Level` as keyof GameState] as number;
    const cost = getUpgradeCost(type, level);
    if (gameState.coins >= cost) {
      setGameState(g => {
        const newLevel = level + 1;
        const newState = {
          ...g,
          coins: g.coins - cost,
          [`${type}Level`]: newLevel
        };
        
        // If we upgraded time, update sectorTime immediately
        if (type === 'time') {
          setSectorTime(getUpgradePower('time', newLevel));
        }
        
        return newState;
      });
      setUpgradeFlash(type);
      setTimeout(() => setUpgradeFlash(null), 500);
    }
  };

  const craftItem = (recipe: typeof CRAFTING_RECIPES[0]) => {
    const canCraft = Object.entries(recipe.ingredients).every(([name, count]) => (gameState.essence[name] || 0) >= count);
    if (canCraft) {
      setGameState(g => {
        const newEssence = { ...g.essence };
        Object.entries(recipe.ingredients).forEach(([name, count]) => {
          newEssence[name] -= count;
        });
        return {
          ...g,
          essence: newEssence,
          activeBuffs: {
            ...g.activeBuffs,
            [recipe.buff]: Date.now() + recipe.duration
          }
        };
      });
    }
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    pointerTypeRef.current = e.pointerType as any;
    if (!gridRef.current) return;
    
    const rect = gridRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    // Manual isometric to grid coordinate conversion
    const mouseX = e.clientX - centerX;
    const mouseY = e.clientY - centerY;
    
    // Isometric projection:
    // x_iso = (x - y) * cos(30)
    // y_iso = (x + y) * sin(30)
    // Inverse:
    // x = (x_iso / cos(30) + y_iso / sin(30)) / 2
    // y = (y_iso / sin(30) - x_iso / cos(30)) / 2
    
    const cos30 = 0.866;
    const sin30 = 0.5;
    const scale = 40; // Tile size in pixels
    
    const gridX = (mouseX / cos30 + mouseY / sin30) / (2 * scale);
    const gridY = (mouseY / sin30 - mouseX / cos30) / (2 * scale);
    
    // Precise float coordinates for fluid sweeping
    const fCol = gridX + GRID_SIZE / 2;
    const fRow = gridY + GRID_SIZE / 2;
    
    if (fCol >= 0 && fCol <= GRID_SIZE && fRow >= 0 && fRow <= GRID_SIZE) {
      const col = Math.floor(fCol);
      const row = Math.floor(fRow);
      setHoveredTile((row >= 0 && row < GRID_SIZE && col >= 0 && col < GRID_SIZE) ? row * GRID_SIZE + col : null);
      precisePosRef.current = { col: fCol, row: fRow };
    } else {
      setHoveredTile(null);
      precisePosRef.current = null;
    }
  };

  const totalMaxHp = useMemo(() => tiles.reduce((sum, t) => sum + t.maxHp, 0), [tiles]);
  const totalCurrentHp = useMemo(() => tiles.reduce((sum, t) => sum + t.hp, 0), [tiles]);
  const progress = totalMaxHp > 0 ? 1 - (totalCurrentHp / totalMaxHp) : 0;

  return (
    <div className="min-h-screen bg-[#0a0a0c] text-stone-100 flex flex-col font-mono selection:bg-transparent touch-none overflow-hidden">
      {/* Background Glow */}
      <div className="fixed inset-0 bg-[radial-gradient(circle_at_50%_50%,#1a1a2e_0%,#0a0a0c_100%)] pointer-events-none" />
      
      <header className="relative z-10 p-4 border-b border-white/5 backdrop-blur-md bg-black/20">
        <div className="flex items-center justify-between max-w-lg mx-auto">
          <div>
            <h1 className="text-lg font-black tracking-tighter text-white uppercase italic">Creature Miner</h1>
            <div className="flex items-center gap-2 text-[10px] text-stone-500 font-bold uppercase tracking-widest">
              <Target className="w-3 h-3" />
              Sector {gameState.level + 1}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <button 
              onClick={() => setShowSettings(true)}
              className="p-2 bg-white/5 rounded-sm border border-white/10 hover:bg-white/10 transition-colors"
            >
              <Settings className="w-4 h-4 text-cyan-400" />
            </button>
            <button 
              onClick={() => setShowCodex(true)}
              className="p-2 bg-white/5 rounded-sm border border-white/10 hover:bg-white/10 transition-colors"
            >
              <Package className="w-4 h-4 text-cyan-400" />
            </button>
            <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-sm border border-white/10 shadow-[0_0_15px_rgba(255,255,255,0.05)]">
              <Coins className="w-4 h-4 text-amber-400" />
              <span className="font-bold text-amber-100">{Math.floor(gameState.coins)}</span>
            </div>
          </div>
        </div>
      </header>

      <main className="flex-1 relative flex flex-col items-center justify-center p-4">
        
        {/* Isometric Grid Container */}
        <motion.div 
          ref={gridRef}
          className="relative w-full max-w-md aspect-square flex items-center justify-center perspective-[1000px] cursor-none"
          animate={{ 
            x: shake ? (Math.random() - 0.5) * shake * 2 : 0,
            y: shake ? (Math.random() - 0.5) * shake * 2 : 0
          }}
          onPointerMove={handlePointerMove}
          onPointerEnter={(e) => {
            pointerTypeRef.current = e.pointerType as any;
          }}
          onPointerDown={(e) => {
            setIsMiningActive(true);
            isMiningActiveRef.current = true;
            pointerTypeRef.current = e.pointerType as any;
            handlePointerMove(e);
          }}
          onPointerUp={() => {
            setIsMiningActive(false);
            isMiningActiveRef.current = false;
          }}
          onPointerLeave={() => {
            setIsMiningActive(false);
            isMiningActiveRef.current = false;
            if (pointerTypeRef.current === 'mouse') {
              precisePosRef.current = null;
            }
          }}
        >
          <div 
            className="relative transition-transform duration-500"
            style={{ 
              transform: `rotateX(60deg) rotateZ(45deg) translateZ(0) translate(${Math.random() * shake - shake/2}px, ${Math.random() * shake - shake/2}px)`,
              width: GRID_SIZE * 40,
              height: GRID_SIZE * 40,
              transformStyle: 'preserve-3d'
            }}
          >
            {/* Grid Lines */}
            <div className="absolute inset-0 border border-white/10 grid pointer-events-none" style={{ gridTemplateColumns: `repeat(${GRID_SIZE}, 1fr)`, gridTemplateRows: `repeat(${GRID_SIZE}, 1fr)` }}>
              {Array.from({ length: TOTAL_TILES }).map((_, i) => (
                <div key={i} className="border border-white/5" />
              ))}
            </div>

            {/* Drones (Sentinels) */}
            {gameState.autoLevel > 0 && Array.from({ length: Math.min(gameState.autoLevel, 4) }).map((_, i) => {
              const pos = dronePositionsRef.current[i] || { x: -80, y: -80, z: 100 };
              return (
                <div
                  key={`drone-${i}`}
                  className="absolute z-[60] pointer-events-none"
                  style={{ 
                    left: pos.x, 
                    top: pos.y,
                    transform: `translate(-50%, -50%) translateZ(${pos.z}px)`,
                    transformStyle: 'preserve-3d'
                  }}
                >
                  {/* Drone Shadow */}
                  <div className="absolute top-full left-1/2 -translate-x-1/2 w-8 h-4 bg-black/30 blur-lg rounded-full" style={{ transform: `translateZ(${-pos.z}px)` }} />
                  
                  <motion.div 
                    animate={{ 
                      y: [0, -5, 0],
                      rotateZ: [0, 5, -5, 0]
                    }}
                    transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                    className="relative"
                  >
                    <Cpu className="w-6 h-6 text-cyan-400 drop-shadow-[0_0_10px_rgba(34,211,238,0.6)]" />
                    <div className="absolute -inset-2 bg-cyan-400/10 blur-xl rounded-full animate-pulse" />
                    
                    {/* Active Mining Indicator */}
                    {droneHits.some(h => h.droneId === i && performance.now() - h.time < 500) && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: [0, 1, 0], scale: [0.5, 1.5, 0.5] }}
                        className="absolute -top-1 -right-1 w-2 h-2 bg-white rounded-full shadow-[0_0_10px_white]"
                      />
                    )}
                  </motion.div>

                  {/* Mining Beams */}
                  <AnimatePresence>
                    {droneHits.filter(h => h.droneId === i && performance.now() - h.time < 200).map(h => {
                      const targetTile = tiles.find(t => t.id === h.tileId);
                      if (!targetTile) return null;
                      const dx = (targetTile.col * 40 + 20) - pos.x;
                      const dy = (targetTile.row * 40 + 20) - pos.y;
                      const dist = Math.sqrt(dx * dx + dy * dy);
                      const angle = Math.atan2(dy, dx) * (180 / Math.PI);
                      
                      return (
                        <motion.div
                          key={h.id}
                          initial={{ opacity: 0, width: 0 }}
                          animate={{ opacity: [0, 0.8, 0], width: dist }}
                          exit={{ opacity: 0 }}
                          className="absolute top-1/2 left-1/2 h-0.5 bg-cyan-400/50 blur-[1px] origin-left"
                          style={{ transform: `translate(0, -50%) rotate(${angle}deg)` }}
                        />
                      );
                    })}
                  </AnimatePresence>
                </div>
              );
            })}

            {/* Attack Range Circle (Ref-based for performance) */}
            <div 
              ref={cursorCircleRef}
              className={cn(
                "absolute border-2 rounded-full pointer-events-none flex items-center justify-center opacity-0 transition-all duration-150",
                isMiningActive || pointerTypeRef.current === 'mouse' ? "border-white/60 bg-white/10 scale-100" : "border-white/40 bg-white/5 scale-95",
                performance.now() - lastAttackVisualTime < 150 && "bg-white/40 blur-[6px] scale-110 border-white"
              )}
              style={{
                width: (getUpgradePower('size', gameState.sizeLevel) * 2) * 40,
                height: (getUpgradePower('size', gameState.sizeLevel) * 2) * 40,
                transform: 'translate(-50%, -50%)',
                boxShadow: '0 0 15px rgba(255,255,255,0.1) inset'
              }}
            >
              {/* Cooldown Ring */}
              <svg className="absolute inset-0 w-full h-full -rotate-90 opacity-40">
                <circle
                  ref={cooldownRingRef}
                  cx="50%"
                  cy="50%"
                  r="48%"
                  fill="none"
                  stroke="white"
                  strokeWidth="2"
                  strokeDasharray="100 100"
                  style={{ strokeDashoffset: 100 }}
                />
              </svg>
            </div>

            {/* Entities */}
            {tiles.map((tile) => {
              if (tile.hp <= 0) return null;
              const EntityIcon = tile.entity?.icon || Skull;
              const isHovered = hoveredTile === tile.id;
              const radius = getUpgradePower('size', gameState.sizeLevel);
              const hCol = hoveredTile !== null ? hoveredTile % GRID_SIZE : -1;
              const hRow = hoveredTile !== null ? Math.floor(hoveredTile / GRID_SIZE) : -1;
              const isInRange = Math.max(Math.abs(tile.col - hCol), Math.abs(tile.row - hRow)) <= radius;

              return (
                <motion.div
                  key={tile.id}
                  initial={{ scale: 0 }}
                  animate={{ 
                    scale: 1,
                    z: isHovered ? -5 : 0,
                    opacity: tile.hp / tile.maxHp
                  }}
                  className="absolute"
                  style={{
                    width: 40,
                    height: 40,
                    left: tile.col * 40,
                    top: tile.row * 40,
                    transformStyle: 'preserve-3d'
                  }}
                >
                  {/* Entity Body */}
                  <div className={cn(
                    "absolute inset-1 rounded-sm flex items-center justify-center transition-all duration-200",
                    tile.entity?.glow,
                    "bg-stone-900 border border-white/10 shadow-lg",
                    isInRange && "scale-90 brightness-150 border-white/40",
                    tile.entity?.isBoss && "border-red-500/50 scale-110"
                  )}
                  style={{
                    transform: gameState.lowPerformanceMode 
                      ? undefined 
                      : `translateZ(${tile.hp > 0 ? 10 : 0}px) rotateX(${tile.rotation}deg) rotateY(${tile.rotation}deg)`,
                    opacity: tile.hp > 0 ? 1 : 0.5
                  }}
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-white/5 to-transparent pointer-events-none" />
                    <motion.div
                      animate={{ 
                        scale: performance.now() - tile.lastHitTime < 100 ? [1, 1.3, 1] : [1, 1.05, 1],
                        y: [0, -2, 0],
                        rotate: tile.rotation,
                        filter: performance.now() - tile.lastHitTime < 100 ? 'brightness(2) contrast(1.5)' : 'brightness(1) contrast(1)'
                      }}
                      transition={{ 
                        duration: performance.now() - tile.lastHitTime < 100 ? 0.1 : 2 + tile.variation * 2, 
                        repeat: performance.now() - tile.lastHitTime < 100 ? 0 : Infinity, 
                        ease: "easeInOut" 
                      }}
                    >
                      <EntityIcon 
                        className={cn("w-6 h-6 drop-shadow-[0_0_8px_rgba(255,255,255,0.3)]", tile.entity?.color || "text-stone-500")} 
                        style={{ 
                          filter: `hue-rotate(${tile.hue}deg) saturate(${1 + tile.variation * 0.5})`,
                          transform: `scale(${tile.scale})`
                        }}
                      />
                    </motion.div>
                    
                    {/* Health Bar */}
                    <div className="absolute -bottom-1 left-1 right-1 h-1 bg-black/50 rounded-full overflow-hidden border border-white/5">
                      <div 
                        className="h-full bg-red-500 transition-all duration-100"
                        style={{ width: `${(tile.hp / tile.maxHp) * 100}%` }}
                      />
                    </div>
                  </div>
                </motion.div>
              );
            })}

            {/* Particles */}
            {particles.map(p => (
              <div 
                key={p.id}
                className={cn("absolute w-1 h-1 rounded-full", p.color)}
                style={{
                  left: p.x + (GRID_SIZE * 40) / 2,
                  top: p.y + (GRID_SIZE * 40) / 2,
                  transform: 'translateZ(20px)'
                }}
              />
            ))}
          </div>
        </motion.div>

        {/* Combo Multiplier */}
        <AnimatePresence>
          {combo > 1 && (
            <motion.div
              initial={{ opacity: 0, scale: 0.5, y: -20 }}
              animate={{ opacity: 1, scale: 1.1, y: 0 }}
              exit={{ opacity: 0, scale: 1.5 }}
              key={combo}
              className="absolute top-32 z-50 text-center pointer-events-none flex flex-col items-center"
            >
              <motion.div 
                animate={{ scale: [1, 1.2, 1] }}
                className="text-5xl font-black text-white italic tracking-tighter drop-shadow-[0_0_15px_rgba(255,255,255,0.8)]"
              >
                {combo}x COMBO
              </motion.div>
              <div className="bg-cyan-500 text-black px-3 py-0.5 rounded-full text-[10px] font-black uppercase tracking-widest mt-1 shadow-[0_0_10px_rgba(6,182,212,0.5)]">
                +{(combo * 5)}% COIN BONUS
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Distortion Overlay */}
        <AnimatePresence>
          {distortion > 0 && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] pointer-events-none overflow-hidden"
            >
              <div className="absolute inset-0 bg-cyan-500/10 mix-blend-overlay animate-pulse" />
              <div className="absolute inset-0 backdrop-blur-[2px] backdrop-contrast-150" />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-[200%] h-[200%] bg-[radial-gradient(circle,transparent_0%,rgba(0,0,0,0.8)_100%)] animate-[spin_10s_linear_infinite]" />
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Sector Stability UI */}
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 w-full max-w-xs z-50 px-4">
          <div className="flex justify-between items-end mb-1 px-1">
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-cyan-400 uppercase tracking-widest leading-none">Sector Stability</span>
              <span className="text-[8px] font-bold text-stone-500 uppercase tracking-tighter">Temporal Integrity: {((sectorTime / getUpgradePower('time', gameState.timeLevel)) * 100).toFixed(1)}%</span>
            </div>
            <div className="flex items-center gap-1.5">
              <Activity className={cn("w-3 h-3", sectorTime < 5 ? "text-red-500 animate-pulse" : "text-cyan-400")} />
              <span className={cn("text-xs font-mono font-black", sectorTime < 5 ? "text-red-500" : "text-white")}>
                {sectorTime.toFixed(1)}s
              </span>
            </div>
          </div>
          <div className="h-1.5 bg-black/40 rounded-full overflow-hidden border border-white/5 backdrop-blur-sm p-[1px]">
            <motion.div 
              className={cn(
                "h-full bg-gradient-to-r from-cyan-500 via-white to-cyan-500 shadow-[0_0_15px_rgba(255,255,255,0.5)] rounded-full",
                sectorTime < 5 && "from-red-500 via-white to-red-500"
              )}
              animate={{ width: `${(sectorTime / getUpgradePower('time', gameState.timeLevel)) * 100}%` }}
              transition={{ type: "spring", stiffness: 100, damping: 20 }}
            />
          </div>
        </div>

        {/* Active Buffs */}
        <div className="fixed top-4 left-4 z-50 flex flex-col gap-2">
          {Object.entries(gameState.activeBuffs).map(([buff, endTime]) => {
            const timeLeft = Math.max(0, ((endTime as number) - Date.now()) / 1000);
            const recipe = CRAFTING_RECIPES.find(r => r.buff === buff);
            if (!recipe) return null;
            const Icon = recipe.icon;
            return (
              <motion.div
                key={buff}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                className="bg-black/60 border border-cyan-500/30 backdrop-blur-md px-3 py-2 rounded-sm flex items-center gap-3"
              >
                <div className="bg-cyan-500 p-1 rounded-sm">
                  <Icon className="w-3 h-3 text-white" />
                </div>
                <div>
                  <div className="text-[8px] font-black text-white uppercase tracking-tighter">{recipe.name}</div>
                  <div className="text-[10px] font-mono text-cyan-400">{timeLeft.toFixed(0)}s</div>
                </div>
              </motion.div>
            );
          })}
        </div>

        <AnimatePresence>
          {newDiscovery && (
            <motion.div
              initial={{ opacity: 0, x: 50 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 50 }}
              className="fixed top-24 right-4 z-[150] bg-cyan-500/20 border border-cyan-500/50 backdrop-blur-md p-3 rounded-sm flex items-center gap-3 shadow-[0_0_20px_rgba(6,182,212,0.2)]"
            >
              <div className="bg-cyan-500 p-1.5 rounded-sm">
                <Sparkles className="w-4 h-4 text-white" />
              </div>
              <div>
                <div className="text-[8px] font-black text-cyan-300 uppercase tracking-widest">New Discovery</div>
                <div className="text-sm font-black text-white uppercase italic">{newDiscovery}</div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showCodex && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-md z-[100] p-4"
            >
              <div className="w-full max-w-lg bg-stone-900 border border-white/10 rounded-sm flex flex-col max-h-[80vh]">
                <div className="p-4 border-b border-white/10 flex justify-between items-center">
                  <h2 className="text-xl font-black text-white uppercase italic tracking-tighter">Creature Codex</h2>
                  <button onClick={() => setShowCodex(false)} className="text-stone-500 hover:text-white">Close</button>
                </div>
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                  {ENTITIES.map(ent => {
                    const isDiscovered = gameState.discovered.includes(ent.id);
                    const Icon = ent.icon;
                    return (
                      <div key={ent.id} className={cn(
                        "p-4 border rounded-sm flex gap-4 transition-all",
                        isDiscovered ? "bg-white/5 border-white/10" : "bg-black/20 border-white/5 opacity-50"
                      )}>
                        <div className={cn(
                          "w-16 h-16 rounded-sm flex items-center justify-center border border-white/10",
                          isDiscovered ? ent.glow : "bg-stone-800"
                        )}>
                          {isDiscovered ? <Icon className={cn("w-8 h-8", ent.color)} /> : <Skull className="w-8 h-8 text-stone-700" />}
                        </div>
                        <div className="flex-1">
                          <h3 className="font-black text-white uppercase tracking-tight">
                            {isDiscovered ? ent.name : "???"}
                          </h3>
                          <p className="text-[10px] text-stone-500 mt-1 leading-relaxed">
                            {isDiscovered ? ent.lore : "Continue mining to unlock information about this creature."}
                          </p>
                          {isDiscovered && (
                            <div className="space-y-2 mt-2">
                              <div className="flex gap-3">
                                <div className="text-[8px] font-bold text-stone-400 uppercase">HP: {ent.hpMult}x</div>
                                <div className="text-[8px] font-bold text-amber-400 uppercase">Reward: {ent.rewardCoins}</div>
                              </div>
                              {ent.abilities && ent.abilities.length > 0 && (
                                <div className="text-[8px] text-cyan-400">
                                  <span className="font-bold uppercase">Abilities:</span> {ent.abilities.map(a => a.name).join(', ')}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showLevelComplete && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center bg-black/80 backdrop-blur-xl z-[200] p-4"
            >
              <div className="w-full max-w-sm bg-stone-900 border border-white/10 rounded-sm p-8 text-center relative overflow-hidden">
                {/* Background Glow */}
                <div className="absolute -top-24 -left-24 w-48 h-48 bg-cyan-500/10 blur-[100px] rounded-full" />
                
                <Trophy className="w-16 h-16 text-amber-400 mx-auto mb-4 relative z-10" />
                <h2 className="text-3xl font-black text-white uppercase italic tracking-tighter relative z-10">
                  {(gameState.level + 1) % 5 === 0 ? 'Boss Terminated' : 'Sector Cleared'}
                </h2>
                <p className="text-stone-500 text-xs mt-2 uppercase tracking-widest mb-4 relative z-10">Coordinate {gameState.level + 1} secured</p>
                
                <div className="bg-black/40 border border-white/5 rounded-sm p-4 mb-8 space-y-3 relative z-10">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] text-stone-500 uppercase font-bold">Credits Earned</span>
                    <div className="flex items-center gap-1 text-amber-400 font-black">
                      <Coins className="w-3 h-3" />
                      {Math.floor(gameState.levelCoins)}
                    </div>
                  </div>
                  <div className="space-y-1">
                    <div className="text-[10px] text-stone-500 uppercase font-bold text-left mb-1">Essence Collected</div>
                    <div className="grid grid-cols-2 gap-2">
                      {Object.entries(gameState.levelEssence).map(([name, count]) => (
                        <div key={name} className="flex items-center gap-1.5 bg-white/5 px-2 py-1 rounded-sm text-[8px] border border-white/5">
                          <Sparkles className="w-2 h-2 text-cyan-400" />
                          <span className="text-stone-400 truncate">{name}</span>
                          <span className="font-bold text-white ml-auto">{count}</span>
                        </div>
                      ))}
                      {Object.keys(gameState.levelEssence).length === 0 && (
                        <div className="col-span-2 text-[8px] text-stone-600 italic">No essence collected</div>
                      )}
                    </div>
                  </div>
                </div>
                
                <div className="grid gap-3">
                  <div className="grid grid-cols-3 gap-2">
                    <button 
                      onClick={() => setShowCrafting(true)}
                      className="py-4 bg-white/5 border border-white/10 text-white font-black uppercase tracking-tighter hover:bg-white/10 transition-colors rounded-sm flex items-center justify-center gap-2"
                    >
                      <Package className="w-4 h-4" />
                      Craft
                    </button>
                    <button 
                      onClick={() => setShowSkillTree(true)}
                      className="py-4 bg-white text-black font-black uppercase tracking-tighter hover:bg-stone-200 transition-colors rounded-sm flex items-center justify-center gap-2"
                    >
                      <Zap className="w-4 h-4" />
                      Skills
                    </button>
                    <button 
                      onClick={activateBoost}
                      disabled={gameState.coins < 2000 || !!gameState.activeBuffs['power_boost']}
                      className={cn(
                        "py-4 font-black uppercase tracking-tighter transition-all rounded-sm flex flex-col items-center justify-center relative overflow-hidden",
                        gameState.activeBuffs['power_boost'] 
                          ? "bg-cyan-500 text-black" 
                          : gameState.coins >= 2000 
                            ? "bg-amber-400 text-black hover:bg-amber-300" 
                            : "bg-white/5 border border-white/10 text-stone-600 opacity-50 cursor-not-allowed"
                      )}
                    >
                      <div className="flex items-center gap-1">
                        <Flame className="w-4 h-4" />
                        Boost
                      </div>
                      <div className="text-[8px] font-bold opacity-70">2K Credits</div>
                      {gameState.activeBuffs['power_boost'] && (
                        <motion.div 
                          initial={{ width: "100%" }}
                          animate={{ width: "0%" }}
                          transition={{ duration: (gameState.activeBuffs['power_boost'] - performance.now()) / 1000, ease: "linear" }}
                          className="absolute bottom-0 left-0 h-1 bg-white/50"
                        />
                      )}
                    </button>
                  </div>
                  <button 
                    onClick={nextLevel}
                    className="w-full py-4 bg-white/5 border border-white/10 text-white font-black uppercase tracking-tighter hover:bg-white/10 transition-colors rounded-sm flex items-center justify-center gap-2"
                  >
                    <ChevronRight className="w-4 h-4" />
                    Next Sector
                  </button>
                  <button 
                    onClick={() => setShowSettings(true)}
                    className="w-full py-2 bg-transparent text-stone-500 font-bold uppercase tracking-widest hover:text-white transition-colors text-[10px] flex items-center justify-center gap-2"
                  >
                    <Settings className="w-3 h-3" />
                    System Settings
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showSettings && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 flex items-center justify-center bg-black/90 backdrop-blur-xl z-[300] p-4"
            >
              <div className="w-full max-w-xs bg-stone-900 border border-white/10 rounded-sm p-6">
                <h2 className="text-xl font-black text-white uppercase italic tracking-tighter mb-6 flex items-center gap-2">
                  <Settings className="w-5 h-5 text-cyan-400" />
                  System Config
                </h2>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-white/5 border border-white/10 rounded-sm">
                    <div className="flex items-center gap-2">
                      <Activity className="w-4 h-4 text-cyan-400" />
                      <span className="text-[10px] font-bold text-white uppercase tracking-widest">Simple Visuals</span>
                    </div>
                    <button 
                      onClick={togglePerformanceMode}
                      className={cn(
                        "w-10 h-5 rounded-full transition-colors relative",
                        gameState.lowPerformanceMode ? "bg-cyan-500" : "bg-white/10"
                      )}
                    >
                      <div className={cn(
                        "absolute top-1 w-3 h-3 bg-white rounded-full transition-all",
                        gameState.lowPerformanceMode ? "left-6" : "left-1"
                      )} />
                    </button>
                  </div>

                  <button 
                    onClick={() => {
                      setShowCodex(true);
                      setShowSettings(false);
                    }}
                    className="w-full py-3 bg-white/5 border border-white/10 text-white font-bold uppercase tracking-widest hover:bg-white/10 transition-colors rounded-sm flex items-center justify-center gap-2 text-xs"
                  >
                    <Database className="w-4 h-4 text-cyan-400" />
                    Creature Codex
                  </button>
                  
                  <div className="pt-4 border-t border-white/5">
                    {!showResetConfirm ? (
                      <button 
                        onClick={() => setShowResetConfirm(true)}
                        className="w-full py-3 bg-red-500/10 border border-red-500/20 text-red-500 font-bold uppercase tracking-widest hover:bg-red-500/20 transition-colors rounded-sm flex items-center justify-center gap-2 text-xs"
                      >
                        <Trash2 className="w-4 h-4" />
                        Reset All Data
                      </button>
                    ) : (
                      <div className="space-y-2">
                        <div className="text-[10px] text-red-400 font-bold uppercase tracking-widest text-center mb-2">
                          Are you absolutely sure?
                        </div>
                        <div className="flex gap-2">
                          <button 
                            onClick={resetGame}
                            className="flex-1 py-2 bg-red-500 text-white font-bold uppercase tracking-widest hover:bg-red-600 transition-colors rounded-sm text-[10px]"
                          >
                            Yes, Reset
                          </button>
                          <button 
                            onClick={() => setShowResetConfirm(false)}
                            className="flex-1 py-2 bg-white/10 text-white font-bold uppercase tracking-widest hover:bg-white/20 transition-colors rounded-sm text-[10px]"
                          >
                            Cancel
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                  
                  <button 
                    onClick={() => setShowSettings(false)}
                    className="w-full py-3 text-stone-500 font-bold uppercase tracking-widest hover:text-white transition-colors text-[10px]"
                  >
                    Close Settings
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showSkillTree && (
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="absolute inset-0 flex items-center justify-center bg-black/90 backdrop-blur-2xl z-[210] p-4"
            >
              <div className="w-full max-w-lg bg-stone-900 border border-white/10 rounded-sm flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-white/10 flex justify-between items-center">
                  <div>
                    <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter">Skill Tree</h2>
                    <div className="flex items-center gap-2 text-amber-400 text-xs font-bold mt-1">
                      <Coins className="w-3 h-3" />
                      {Math.floor(gameState.coins)} Credits Available
                    </div>
                  </div>
                  <button onClick={() => setShowSkillTree(false)} className="text-stone-500 hover:text-white uppercase text-[10px] font-bold">Back</button>
                </div>
                
                <div className="flex-1 overflow-y-auto p-6 grid grid-cols-1 gap-4">
                  {(Object.keys(UPGRADES) as UpgradeType[]).map((type) => {
                    const upgrade = UPGRADES[type];
                    const Icon = upgrade.icon;
                    const level = gameState[`${type}Level` as keyof GameState] as number;
                    const cost = getUpgradeCost(type, level);
                    const canAfford = gameState.coins >= cost;
                    
                    const isUnlocked = !upgrade.unlockedBy || (gameState[`${upgrade.unlockedBy}Level` as keyof GameState] as number) > 0;
                    if (!isUnlocked) return null;

                    return (
                      <button
                        key={type}
                        onClick={() => buyUpgrade(type)}
                        disabled={!canAfford}
                        title={`Next ${upgrade.desc}: ${getUpgradePower(type, level + 1).toFixed(2)}${type === 'speed' || type === 'droneSpeed' ? 's' : ''}`}
                        className={cn(
                          "flex items-center p-4 rounded-sm border transition-all relative overflow-hidden group text-left",
                          canAfford ? "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20" : "bg-black/20 border-white/5 opacity-50 cursor-not-allowed",
                          upgradeFlash === type && "bg-cyan-500/20 border-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.4)] scale-[1.02]"
                        )}
                      >
                        {upgradeFlash === type && (
                          <motion.div 
                            initial={{ scale: 0, opacity: 1 }}
                            animate={{ scale: 2, opacity: 0 }}
                            className="absolute inset-0 bg-white/20 rounded-full pointer-events-none"
                          />
                        )}
                        <div className={cn(
                          "w-12 h-12 rounded-sm flex items-center justify-center border border-white/10 mr-4 transition-transform group-hover:scale-110",
                          canAfford ? "bg-white/10 text-white" : "bg-stone-800 text-stone-600"
                        )}>
                          <Icon className="w-6 h-6" />
                        </div>
                        
                        <div className="flex-1">
                          <div className="flex justify-between items-start">
                            <h3 className="font-black text-white uppercase tracking-tight">{upgrade.name}</h3>
                            <span className="text-[10px] font-bold text-stone-500 uppercase">Lv.{level}</span>
                          </div>
                          <div className="flex justify-between items-center mt-1">
                            <p className="text-[10px] text-stone-500 uppercase tracking-widest">{upgrade.desc}</p>
                            <span className="text-[9px] font-bold text-cyan-400 uppercase">Next: {getUpgradePower(type, level + 1).toFixed(2)}{type === 'speed' || type === 'droneSpeed' ? 's' : ''}</span>
                          </div>
                          
                          <div className="flex gap-1 mt-2">
                            {Array.from({ length: 10 }).map((_, i) => (
                              <div key={i} className={cn(
                                "h-1 flex-1 rounded-full",
                                i < level % 10 ? "bg-cyan-400" : "bg-white/5"
                              )} />
                            ))}
                          </div>
                        </div>
                        
                        <div className={cn(
                          "ml-4 px-3 py-2 rounded-sm border font-black text-xs flex items-center gap-2",
                          canAfford ? "bg-amber-400/10 border-amber-400/20 text-amber-400" : "bg-stone-800/50 border-white/5 text-stone-600"
                        )}>
                          <Coins className="w-3 h-3" />
                          {cost}
                        </div>
                      </button>
                    );
                  })}
                </div>
                
                <div className="p-6 border-t border-white/10">
                  <button 
                    onClick={nextLevel}
                    className="w-full py-4 bg-white text-black font-black uppercase tracking-tighter hover:bg-stone-200 transition-colors rounded-sm"
                  >
                    Confirm & Deploy to Next Sector
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

        <AnimatePresence>
          {showCrafting && (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="absolute inset-0 flex items-center justify-center bg-black/90 backdrop-blur-2xl z-[220] p-4"
            >
              <div className="w-full max-w-lg bg-stone-900 border border-white/10 rounded-sm flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-white/10 flex justify-between items-center">
                  <div>
                    <h2 className="text-2xl font-black text-white uppercase italic tracking-tighter">Essence Crafting</h2>
                    <p className="text-stone-500 text-[10px] font-bold uppercase tracking-widest mt-1">Combine essence for temporary power</p>
                  </div>
                  <button onClick={() => setShowCrafting(false)} className="text-stone-500 hover:text-white uppercase text-[10px] font-bold">Back</button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                  {CRAFTING_RECIPES.map(recipe => {
                    const canCraft = Object.entries(recipe.ingredients).every(([name, count]) => (gameState.essence[name] || 0) >= count);
                    const Icon = recipe.icon;
                    const isActive = !!gameState.activeBuffs[recipe.buff];

                    return (
                      <div key={recipe.id} className={cn(
                        "p-4 border rounded-sm flex flex-col gap-4 transition-all",
                        canCraft ? "bg-white/5 border-white/10" : "bg-black/20 border-white/5 opacity-50"
                      )}>
                        <div className="flex gap-4">
                          <div className="w-12 h-12 bg-white/10 rounded-sm flex items-center justify-center border border-white/10">
                            <Icon className="w-6 h-6 text-cyan-400" />
                          </div>
                          <div className="flex-1">
                            <h3 className="font-black text-white uppercase tracking-tight">{recipe.name}</h3>
                            <p className="text-[10px] text-stone-500 mt-1">{recipe.desc}</p>
                          </div>
                          {isActive && (
                            <div className="bg-cyan-500 text-black px-2 py-1 rounded-sm text-[8px] font-black uppercase h-fit">Active</div>
                          )}
                        </div>

                        <div className="flex flex-wrap gap-2">
                          {Object.entries(recipe.ingredients).map(([name, count]) => (
                            <div key={name} className="flex items-center gap-1.5 bg-black/40 px-2 py-1 rounded-sm text-[8px] border border-white/5">
                              <span className={cn(
                                "font-bold",
                                (gameState.essence[name] || 0) >= count ? "text-cyan-400" : "text-red-500"
                              )}>
                                {gameState.essence[name] || 0}/{count}
                              </span>
                              <span className="text-stone-500 uppercase">{name}</span>
                            </div>
                          ))}
                        </div>

                        <button
                          onClick={() => craftItem(recipe)}
                          disabled={!canCraft || isActive}
                          className={cn(
                            "w-full py-2 font-black uppercase text-[10px] tracking-widest rounded-sm transition-all",
                            canCraft && !isActive ? "bg-cyan-500 text-black hover:bg-cyan-400" : "bg-white/5 text-stone-600 cursor-not-allowed"
                          )}
                        >
                          {isActive ? 'Buff Active' : 'Craft & Activate'}
                        </button>
                      </div>
                    );
                  })}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <footer className="relative z-10 bg-black/40 border-t border-white/5 p-4 pb-[calc(env(safe-area-inset-bottom)+100px)] backdrop-blur-xl">
        <div className="max-w-lg mx-auto flex justify-center">
          <div className="text-[10px] font-bold text-stone-500 uppercase tracking-widest">
            Sector {gameState.level + 1} • Coordinate {gameState.level + 1}
          </div>
        </div>
      </footer>
    </div>
  );
}
