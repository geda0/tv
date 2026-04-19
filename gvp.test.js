import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { pickVideoMimeType } from './gvp.js';

describe('pickVideoMimeType', () => {
    let orig;

    beforeEach(() => {
        orig = globalThis.MediaRecorder;
    });

    afterEach(() => {
        globalThis.MediaRecorder = orig;
    });

    it('returns the first candidate supported by MediaRecorder', () => {
        const supported = new Set(['video/webm;codecs=vp9,opus', 'video/webm']);
        globalThis.MediaRecorder = class {
            static isTypeSupported(t) {
                return supported.has(t);
            }
        };
        expect(pickVideoMimeType()).toBe('video/webm;codecs=vp9,opus');
    });

    it('falls through candidates until one is supported', () => {
        const supported = new Set(['video/webm']);
        globalThis.MediaRecorder = class {
            static isTypeSupported(t) {
                return supported.has(t);
            }
        };
        expect(pickVideoMimeType()).toBe('video/webm');
    });

    it('returns empty string when none are supported', () => {
        globalThis.MediaRecorder = class {
            static isTypeSupported() {
                return false;
            }
        };
        expect(pickVideoMimeType()).toBe('');
    });
});
