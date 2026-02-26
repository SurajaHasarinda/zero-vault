import React, { useState, useCallback, useEffect } from 'react';
import {
    RefreshCw,
    Copy,
    Check,
    Sparkles,
    ShieldCheck,
    Sliders,
    BookOpen,
    Zap,
    Lock,
    Hash,
    AtSign,
    CaseSensitive,
    CaseLower,
    Minus,
    Plus,
    Info,
} from 'lucide-react';
import Snackbar, { SnackbarType } from '../components/common/Snackbar';

/* ────────────────────────────────────────────────────────────────────────────
 *  Word list for memorable passphrases
 *  A curated list of short, common, easy-to-visualise English words.
 * ──────────────────────────────────────────────────────────────────────────── */
const WORDLIST: string[] = [
    'acid', 'acorn', 'acre', 'alpha', 'amber', 'anchor', 'angel', 'anvil',
    'apple', 'arch', 'arena', 'arrow', 'atlas', 'atom', 'badge', 'baker',
    'barn', 'bash', 'beach', 'beast', 'berry', 'blade', 'blaze', 'bloom',
    'board', 'bolt', 'bone', 'boost', 'brave', 'brick', 'brook', 'brush',
    'cabin', 'candy', 'cargo', 'cedar', 'chain', 'charm', 'chess', 'chief',
    'cider', 'cliff', 'clock', 'cloud', 'cobra', 'comet', 'coral', 'crane',
    'crash', 'creek', 'crest', 'crown', 'crush', 'cubic', 'curve', 'cycle',
    'dance', 'darts', 'delta', 'depot', 'disco', 'dodge', 'dome', 'draft',
    'drake', 'dream', 'drift', 'drum', 'dusk', 'eagle', 'earth', 'echo',
    'edge', 'ember', 'epic', 'fable', 'fang', 'feast', 'fiber', 'field',
    'flame', 'flash', 'flint', 'float', 'flora', 'forge', 'forte', 'frost',
    'gale', 'gamma', 'gem', 'ghost', 'giant', 'glade', 'gleam', 'globe',
    'glory', 'goat', 'grain', 'grape', 'grasp', 'gravel', 'grove', 'guard',
    'haven', 'hawk', 'heart', 'hero', 'hive', 'honey', 'horn', 'hover',
    'hyper', 'ivory', 'jade', 'jazz', 'jewel', 'jolly', 'judge', 'juice',
    'kite', 'knack', 'knight', 'knot', 'lake', 'lance', 'latch', 'lava',
    'leaf', 'level', 'light', 'linen', 'lion', 'lotus', 'lunar', 'maple',
    'marsh', 'medal', 'melon', 'merge', 'metro', 'mirth', 'mocha', 'model',
    'molar', 'money', 'moon', 'morse', 'motor', 'music', 'myth', 'nectar',
    'nerve', 'ninja', 'noble', 'north', 'novel', 'oak', 'oasis', 'ocean',
    'olive', 'omega', 'onyx', 'orbit', 'otter', 'oxide', 'panda', 'panel',
    'party', 'patch', 'pearl', 'phase', 'pilot', 'pixel', 'plank', 'plaza',
    'plum', 'polar', 'pony', 'prism', 'probe', 'proud', 'pulse', 'quake',
    'queen', 'quest', 'radar', 'ramen', 'ranch', 'raven', 'realm', 'ridge',
    'rival', 'river', 'robin', 'robot', 'rocky', 'royal', 'ruby', 'sage',
    'salon', 'scale', 'scout', 'shark', 'shell', 'shine', 'sigma', 'silk',
    'siren', 'skull', 'slate', 'sleek', 'slice', 'slope', 'solar', 'sonic',
    'spark', 'spear', 'spice', 'spine', 'spoil', 'spray', 'squad', 'staff',
    'stamp', 'steam', 'steel', 'stone', 'storm', 'sugar', 'surge', 'sweep',
    'swift', 'sword', 'table', 'tango', 'thorn', 'tiger', 'toast', 'token',
    'topaz', 'torch', 'tower', 'trail', 'tribe', 'trick', 'trout', 'trunk',
    'tulip', 'ultra', 'unity', 'urban', 'valve', 'vault', 'venus', 'vigor',
    'viola', 'viper', 'vivid', 'voice', 'wagon', 'waltz', 'water', 'whale',
    'wheat', 'width', 'willow', 'witch', 'wizard', 'wolf', 'wrist', 'xenon',
    'yacht', 'yield', 'youth', 'zebra', 'zinc', 'zone',
];

/* ────────────────────────────────────────────────────────────────────────────
 *  Crypto-secure random helpers
 * ──────────────────────────────────────────────────────────────────────────── */
function secureRandomInt(max: number): number {
    const array = new Uint32Array(1);
    crypto.getRandomValues(array);
    return array[0] % max;
}

function secureRandomWord(): string {
    return WORDLIST[secureRandomInt(WORDLIST.length)];
}

/* ────────────────────────────────────────────────────────────────────────────
 *  Password generators
 * ──────────────────────────────────────────────────────────────────────────── */
interface PasswordOptions {
    length: number;
    uppercase: boolean;
    lowercase: boolean;
    numbers: boolean;
    symbols: boolean;
}

function generateRandomPassword(opts: PasswordOptions): string {
    const charSets: string[] = [];
    const required: string[] = [];

    if (opts.uppercase) {
        const set = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
        charSets.push(set);
        required.push(set[secureRandomInt(set.length)]);
    }
    if (opts.lowercase) {
        const set = 'abcdefghijklmnopqrstuvwxyz';
        charSets.push(set);
        required.push(set[secureRandomInt(set.length)]);
    }
    if (opts.numbers) {
        const set = '0123456789';
        charSets.push(set);
        required.push(set[secureRandomInt(set.length)]);
    }
    if (opts.symbols) {
        const set = '!@#$%^&*_+-=?';
        charSets.push(set);
        required.push(set[secureRandomInt(set.length)]);
    }

    if (charSets.length === 0) return '';

    const allChars = charSets.join('');
    const result: string[] = [...required];

    for (let i = result.length; i < opts.length; i++) {
        result.push(allChars[secureRandomInt(allChars.length)]);
    }

    // Shuffle using Fisher-Yates
    for (let i = result.length - 1; i > 0; i--) {
        const j = secureRandomInt(i + 1);
        [result[i], result[j]] = [result[j], result[i]];
    }

    return result.join('');
}

interface PassphraseOptions {
    wordCount: number;
    separator: string;
    capitalize: boolean;
    includeNumber: boolean;
}

function generatePassphrase(opts: PassphraseOptions): string {
    const words: string[] = [];
    for (let i = 0; i < opts.wordCount; i++) {
        let word = secureRandomWord();
        if (opts.capitalize) {
            word = word.charAt(0).toUpperCase() + word.slice(1);
        }
        words.push(word);
    }

    let passphrase = words.join(opts.separator);

    if (opts.includeNumber) {
        passphrase += opts.separator + secureRandomInt(100);
    }

    return passphrase;
}

/* ────────────────────────────────────────────────────────────────────────────
 *  Strength calculator
 * ──────────────────────────────────────────────────────────────────────────── */
interface StrengthResult {
    score: number;      // 0-4
    label: string;
    color: string;
    glowColor: string;
    entropy: number;
}

function calculateStrength(password: string): StrengthResult {
    if (!password) return { score: 0, label: 'None', color: '#334155', glowColor: 'transparent', entropy: 0 };

    let poolSize = 0;
    if (/[a-z]/.test(password)) poolSize += 26;
    if (/[A-Z]/.test(password)) poolSize += 26;
    if (/[0-9]/.test(password)) poolSize += 10;
    if (/[^a-zA-Z0-9]/.test(password)) poolSize += 32;

    const entropy = Math.floor(password.length * Math.log2(poolSize || 1));

    if (entropy < 28) return { score: 0, label: 'Very Weak', color: '#ef4444', glowColor: 'rgba(239,68,68,0.3)', entropy };
    if (entropy < 36) return { score: 1, label: 'Weak', color: '#f97316', glowColor: 'rgba(249,115,22,0.3)', entropy };
    if (entropy < 60) return { score: 2, label: 'Fair', color: '#f59e0b', glowColor: 'rgba(245,158,11,0.3)', entropy };
    if (entropy < 80) return { score: 3, label: 'Strong', color: '#10b981', glowColor: 'rgba(16,185,129,0.3)', entropy };
    return { score: 4, label: 'Very Strong', color: '#10b981', glowColor: 'rgba(16,185,129,0.5)', entropy };
}

/* ────────────────────────────────────────────────────────────────────────────
 *  Component
 * ──────────────────────────────────────────────────────────────────────────── */
type Mode = 'random' | 'memorable';

const SEPARATORS = ['-', '.', '_', ' ', '~', '+'];

const GeneratorPage: React.FC = () => {
    const [mode, setMode] = useState<Mode>('random');
    const [password, setPassword] = useState('');
    const [copied, setCopied] = useState(false);
    const [isSpinning, setIsSpinning] = useState(false);

    // Random mode options
    const [length, setLength] = useState(20);
    const [uppercase, setUppercase] = useState(true);
    const [lowercase, setLowercase] = useState(true);
    const [numbers, setNumbers] = useState(true);
    const [symbols, setSymbols] = useState(true);

    // Memorable mode options
    const [wordCount, setWordCount] = useState(4);
    const [separator, setSeparator] = useState('-');
    const [capitalize, setCapitalize] = useState(true);
    const [includeNumber, setIncludeNumber] = useState(true);

    // Snackbar
    const [snackbar, setSnackbar] = useState<{
        open: boolean;
        message: string;
        type: SnackbarType;
    }>({ open: false, message: '', type: 'info' });

    const showSnackbar = (message: string, type: SnackbarType) => {
        setSnackbar({ open: true, message, type });
    };

    const generate = useCallback(() => {
        setIsSpinning(true);
        setTimeout(() => setIsSpinning(false), 500);

        if (mode === 'random') {
            // Make sure at least one charset is selected
            if (!uppercase && !lowercase && !numbers && !symbols) {
                showSnackbar('Select at least one character type', 'warning');
                return;
            }
            setPassword(generateRandomPassword({ length, uppercase, lowercase, numbers, symbols }));
        } else {
            setPassword(generatePassphrase({ wordCount, separator, capitalize, includeNumber }));
        }
    }, [mode, length, uppercase, lowercase, numbers, symbols, wordCount, separator, capitalize, includeNumber]);

    // Generate on first load and on option change
    useEffect(() => {
        generate();
    }, [generate]);

    const copyToClipboard = async () => {
        if (!password) return;
        try {
            await navigator.clipboard.writeText(password);
            setCopied(true);
            showSnackbar('Password copied to clipboard', 'success');
            setTimeout(() => setCopied(false), 2000);
        } catch {
            showSnackbar('Failed to copy', 'error');
        }
    };

    const strength = calculateStrength(password);

    return (
        <div className="space-y-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-xl font-bold text-white flex items-center gap-3">
                        <div className="w-8 h-8 rounded-lg bg-neon-green/10 flex items-center justify-center border border-neon-green/20">
                            <Sparkles size={16} className="text-neon-green" />
                        </div>
                        Password Generator
                    </h1>
                    <p className="text-slate-600 text-xs mt-1.5 font-mono uppercase tracking-wider">
                        Generate secure &amp; memorable passwords · Crypto-random
                    </p>
                </div>
            </div>

            {/* Mode Switcher */}
            <div className="glass rounded-xl cyber-border p-1 flex gap-1">
                <button
                    onClick={() => setMode('random')}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-mono text-xs uppercase tracking-wider font-semibold transition-all duration-300 ${mode === 'random'
                            ? 'bg-neon-green/10 text-neon-green border border-neon-green/20 shadow-[0_0_12px_rgba(16,185,129,0.1)]'
                            : 'text-slate-600 hover:text-slate-400 hover:bg-white/[0.02]'
                        }`}
                >
                    <Sliders size={14} />
                    Random
                </button>
                <button
                    onClick={() => setMode('memorable')}
                    className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg font-mono text-xs uppercase tracking-wider font-semibold transition-all duration-300 ${mode === 'memorable'
                            ? 'bg-neon-green/10 text-neon-green border border-neon-green/20 shadow-[0_0_12px_rgba(16,185,129,0.1)]'
                            : 'text-slate-600 hover:text-slate-400 hover:bg-white/[0.02]'
                        }`}
                >
                    <BookOpen size={14} />
                    Memorable
                </button>
            </div>

            {/* Generated Password Display */}
            <div className="glass-heavy rounded-xl cyber-border-active ring-1 ring-neon-green/10 relative overflow-hidden">
                {/* Top glow */}
                <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-neon-green/50 to-transparent" />

                <div className="p-5">
                    {/* Terminal-style password display */}
                    <div className="terminal-block">
                        <div className="terminal-header !py-2">
                            <div className="terminal-dot bg-accent-red/60" style={{ width: 6, height: 6 }} />
                            <div className="terminal-dot bg-accent-amber/60" style={{ width: 6, height: 6 }} />
                            <div className="terminal-dot bg-neon-green/60" style={{ width: 6, height: 6 }} />
                            <span className="ml-2 text-[9px] text-slate-700 font-mono uppercase tracking-wider">
                                generated password
                            </span>
                        </div>
                        <div className="p-4 flex items-center justify-between gap-3 min-h-[56px]">
                            <p
                                className="text-neon-green-glow font-mono text-base sm:text-lg break-all select-all cursor-text flex-1 leading-relaxed"
                                id="password-output"
                            >
                                {password || '—'}
                            </p>
                            <div className="flex items-center gap-1 flex-shrink-0">
                                <button
                                    onClick={generate}
                                    className="p-2 rounded-lg text-slate-600 hover:text-neon-green hover:bg-neon-green/5 transition-all duration-300"
                                    title="Regenerate"
                                    id="btn-regenerate"
                                >
                                    <RefreshCw
                                        size={16}
                                        className={`transition-transform duration-500 ${isSpinning ? 'animate-spin' : ''}`}
                                    />
                                </button>
                                <button
                                    onClick={copyToClipboard}
                                    className={`p-2 rounded-lg transition-all duration-300 ${copied
                                            ? 'text-neon-green bg-neon-green/10'
                                            : 'text-slate-600 hover:text-neon-green hover:bg-neon-green/5'
                                        }`}
                                    title="Copy to clipboard"
                                    id="btn-copy-password"
                                >
                                    {copied ? <Check size={16} /> : <Copy size={16} />}
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* Strength Meter */}
                    <div className="mt-4 space-y-2">
                        <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                                <ShieldCheck size={12} style={{ color: strength.color }} />
                                <span
                                    className="text-[10px] font-mono uppercase tracking-wider font-semibold"
                                    style={{ color: strength.color }}
                                >
                                    {strength.label}
                                </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <Info size={10} className="text-slate-700" />
                                <span className="text-[10px] text-slate-700 font-mono">
                                    ~{strength.entropy} bits of entropy
                                </span>
                            </div>
                        </div>
                        {/* Segmented bar */}
                        <div className="flex gap-1">
                            {[0, 1, 2, 3, 4].map((i) => (
                                <div
                                    key={i}
                                    className="h-1 flex-1 rounded-full transition-all duration-500"
                                    style={{
                                        backgroundColor: i <= strength.score && password
                                            ? strength.color
                                            : '#1e1e1e',
                                        boxShadow: i <= strength.score && password
                                            ? `0 0 8px ${strength.glowColor}`
                                            : 'none',
                                    }}
                                />
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Options Panel */}
            <div className="glass rounded-xl cyber-border overflow-hidden">
                <div className="flex items-center justify-between px-4 py-3 border-b border-[#1e1e1e] bg-[#0c0c0c]">
                    <div className="flex items-center gap-2">
                        <Sliders size={12} className="text-neon-green" />
                        <span className="text-[10px] text-neon-green font-mono uppercase tracking-wider font-semibold">
                            Configuration
                        </span>
                    </div>
                    <span className="text-[9px] text-slate-700 font-mono uppercase tracking-wider">
                        {mode === 'random' ? 'Random Mode' : 'Passphrase Mode'}
                    </span>
                </div>

                <div className="p-4 space-y-5">
                    {mode === 'random' ? (
                        <>
                            {/* Length Slider */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-[0.15em] font-mono">
                                        Length
                                    </label>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setLength(Math.max(6, length - 1))}
                                            className="w-6 h-6 rounded-md bg-[#141414] border border-[#1e1e1e] text-slate-500 hover:text-neon-green hover:border-neon-green/20 flex items-center justify-center transition-all"
                                            id="btn-length-minus"
                                        >
                                            <Minus size={10} />
                                        </button>
                                        <span className="text-sm font-mono text-neon-green font-bold w-8 text-center">
                                            {length}
                                        </span>
                                        <button
                                            onClick={() => setLength(Math.min(64, length + 1))}
                                            className="w-6 h-6 rounded-md bg-[#141414] border border-[#1e1e1e] text-slate-500 hover:text-neon-green hover:border-neon-green/20 flex items-center justify-center transition-all"
                                            id="btn-length-plus"
                                        >
                                            <Plus size={10} />
                                        </button>
                                    </div>
                                </div>
                                <input
                                    type="range"
                                    min={6}
                                    max={64}
                                    value={length}
                                    onChange={(e) => setLength(Number(e.target.value))}
                                    className="w-full accent-emerald-500 cursor-pointer"
                                    id="slider-length"
                                    style={{
                                        height: '4px',
                                        background: `linear-gradient(to right, #10b981 ${((length - 6) / (64 - 6)) * 100}%, #1e1e1e ${((length - 6) / (64 - 6)) * 100}%)`,
                                        borderRadius: '999px',
                                    }}
                                />
                                <div className="flex justify-between">
                                    <span className="text-[9px] text-slate-700 font-mono">6</span>
                                    <span className="text-[9px] text-slate-700 font-mono">64</span>
                                </div>
                            </div>

                            {/* Character Type Toggles */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-[0.15em] font-mono">
                                    Character Types
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    {[
                                        { label: 'Uppercase', key: 'uppercase', value: uppercase, setter: setUppercase, icon: <CaseSensitive size={14} />, sample: 'A-Z' },
                                        { label: 'Lowercase', key: 'lowercase', value: lowercase, setter: setLowercase, icon: <CaseLower size={14} />, sample: 'a-z' },
                                        { label: 'Numbers', key: 'numbers', value: numbers, setter: setNumbers, icon: <Hash size={14} />, sample: '0-9' },
                                        { label: 'Symbols', key: 'symbols', value: symbols, setter: setSymbols, icon: <AtSign size={14} />, sample: '!@#$' },
                                    ].map((opt) => (
                                        <button
                                            key={opt.key}
                                            onClick={() => opt.setter(!opt.value)}
                                            className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-all duration-300 text-left ${opt.value
                                                    ? 'bg-neon-green/5 border border-neon-green/20 text-neon-green'
                                                    : 'bg-[#0a0a0a] border border-[#1e1e1e] text-slate-600 hover:border-[#2a2a2a]'
                                                }`}
                                            id={`toggle-${opt.key}`}
                                        >
                                            <div className={`w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 transition-all ${opt.value
                                                    ? 'bg-neon-green/10 border border-neon-green/20'
                                                    : 'bg-[#141414] border border-[#1e1e1e]'
                                                }`}>
                                                {opt.icon}
                                            </div>
                                            <div className="min-w-0">
                                                <div className="text-xs font-semibold truncate">
                                                    {opt.label}
                                                </div>
                                                <div className={`text-[9px] font-mono ${opt.value ? 'text-neon-green/50' : 'text-slate-700'}`}>
                                                    {opt.sample}
                                                </div>
                                            </div>
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </>
                    ) : (
                        <>
                            {/* Word Count */}
                            <div className="space-y-3">
                                <div className="flex items-center justify-between">
                                    <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-[0.15em] font-mono">
                                        Word Count
                                    </label>
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => setWordCount(Math.max(3, wordCount - 1))}
                                            className="w-6 h-6 rounded-md bg-[#141414] border border-[#1e1e1e] text-slate-500 hover:text-neon-green hover:border-neon-green/20 flex items-center justify-center transition-all"
                                            id="btn-wordcount-minus"
                                        >
                                            <Minus size={10} />
                                        </button>
                                        <span className="text-sm font-mono text-neon-green font-bold w-8 text-center">
                                            {wordCount}
                                        </span>
                                        <button
                                            onClick={() => setWordCount(Math.min(8, wordCount + 1))}
                                            className="w-6 h-6 rounded-md bg-[#141414] border border-[#1e1e1e] text-slate-500 hover:text-neon-green hover:border-neon-green/20 flex items-center justify-center transition-all"
                                            id="btn-wordcount-plus"
                                        >
                                            <Plus size={10} />
                                        </button>
                                    </div>
                                </div>
                                <input
                                    type="range"
                                    min={3}
                                    max={8}
                                    value={wordCount}
                                    onChange={(e) => setWordCount(Number(e.target.value))}
                                    className="w-full accent-emerald-500 cursor-pointer"
                                    id="slider-wordcount"
                                    style={{
                                        height: '4px',
                                        background: `linear-gradient(to right, #10b981 ${((wordCount - 3) / (8 - 3)) * 100}%, #1e1e1e ${((wordCount - 3) / (8 - 3)) * 100}%)`,
                                        borderRadius: '999px',
                                    }}
                                />
                                <div className="flex justify-between">
                                    <span className="text-[9px] text-slate-700 font-mono">3 words</span>
                                    <span className="text-[9px] text-slate-700 font-mono">8 words</span>
                                </div>
                            </div>

                            {/* Separator Selection */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-[0.15em] font-mono">
                                    Separator
                                </label>
                                <div className="flex gap-1.5 flex-wrap">
                                    {SEPARATORS.map((sep) => (
                                        <button
                                            key={sep}
                                            onClick={() => setSeparator(sep)}
                                            className={`w-10 h-10 rounded-lg font-mono text-sm flex items-center justify-center transition-all duration-300 ${separator === sep
                                                    ? 'bg-neon-green/10 border border-neon-green/20 text-neon-green shadow-[0_0_8px_rgba(16,185,129,0.1)]'
                                                    : 'bg-[#0a0a0a] border border-[#1e1e1e] text-slate-600 hover:border-[#2a2a2a] hover:text-slate-400'
                                                }`}
                                            id={`sep-${sep === ' ' ? 'space' : sep}`}
                                        >
                                            {sep === ' ' ? '⎵' : sep}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Passphrase Toggles */}
                            <div className="space-y-2">
                                <label className="text-[10px] font-semibold text-slate-500 uppercase tracking-[0.15em] font-mono">
                                    Options
                                </label>
                                <div className="grid grid-cols-2 gap-2">
                                    <button
                                        onClick={() => setCapitalize(!capitalize)}
                                        className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-all duration-300 text-left ${capitalize
                                                ? 'bg-neon-green/5 border border-neon-green/20 text-neon-green'
                                                : 'bg-[#0a0a0a] border border-[#1e1e1e] text-slate-600 hover:border-[#2a2a2a]'
                                            }`}
                                        id="toggle-capitalize"
                                    >
                                        <div className={`w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 transition-all ${capitalize
                                                ? 'bg-neon-green/10 border border-neon-green/20'
                                                : 'bg-[#141414] border border-[#1e1e1e]'
                                            }`}>
                                            <CaseSensitive size={14} />
                                        </div>
                                        <div className="min-w-0">
                                            <div className="text-xs font-semibold">Capitalize</div>
                                            <div className={`text-[9px] font-mono ${capitalize ? 'text-neon-green/50' : 'text-slate-700'}`}>
                                                First Letter
                                            </div>
                                        </div>
                                    </button>
                                    <button
                                        onClick={() => setIncludeNumber(!includeNumber)}
                                        className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg transition-all duration-300 text-left ${includeNumber
                                                ? 'bg-neon-green/5 border border-neon-green/20 text-neon-green'
                                                : 'bg-[#0a0a0a] border border-[#1e1e1e] text-slate-600 hover:border-[#2a2a2a]'
                                            }`}
                                        id="toggle-include-number"
                                    >
                                        <div className={`w-7 h-7 rounded-md flex items-center justify-center flex-shrink-0 transition-all ${includeNumber
                                                ? 'bg-neon-green/10 border border-neon-green/20'
                                                : 'bg-[#141414] border border-[#1e1e1e]'
                                            }`}>
                                            <Hash size={14} />
                                        </div>
                                        <div className="min-w-0">
                                            <div className="text-xs font-semibold">Add Number</div>
                                            <div className={`text-[9px] font-mono ${includeNumber ? 'text-neon-green/50' : 'text-slate-700'}`}>
                                                Append 0-99
                                            </div>
                                        </div>
                                    </button>
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Quick Generate Button */}
            <button
                onClick={generate}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 btn-cyber text-white text-xs font-semibold rounded-lg font-mono uppercase tracking-wider"
                id="btn-generate"
            >
                <Zap size={16} />
                Generate New Password
            </button>

            {/* Security Note */}
            <div className="flex items-start gap-3 px-4 py-3 rounded-lg bg-neon-green/[0.03] border border-neon-green/10">
                <Lock size={14} className="text-neon-green/40 flex-shrink-0 mt-0.5" />
                <p className="text-[10px] text-slate-600 font-mono leading-relaxed">
                    Passwords are generated locally using the Web Crypto API (<code className="text-neon-green/60">crypto.getRandomValues</code>).
                    Nothing is transmitted or stored — generation happens entirely in your browser.
                </p>
            </div>

            {/* Snackbar */}
            <Snackbar
                message={snackbar.message}
                type={snackbar.type}
                isOpen={snackbar.open}
                onClose={() => setSnackbar((s) => ({ ...s, open: false }))}
            />
        </div>
    );
};

export default GeneratorPage;
