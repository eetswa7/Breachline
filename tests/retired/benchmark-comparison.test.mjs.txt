import test from 'node:test';
import assert from 'node:assert/strict';
import {compare} from '../scripts/compare-benchmarks.mjs';
import {reportFixture} from './benchmark-fixture.mjs';

test('comparison excludes warmup, requires matching resolution/cap, and preserves session IDs',()=>{
 const a=structuredClone(reportFixture()),b=structuredClone(reportFixture());let result=compare(a,b);assert.equal(result.before_session,a.session.id);assert.equal(result.after_session,b.session.id);assert.equal(result.rows[0].mean_frame_change_percent,0);assert(result.rows[0].fps_cap_limited);assert.equal(result.rows[0].before.frames,a.contexts[0].stats.steady.frame_time.count);assert(result.rows[0].before.frames<a.raw.seen);
 b.contexts[0].graphics.width=900;result=compare(a,b);assert.equal(result.rows[0].status,'no_matching_baseline');assert(!Object.hasOwn(result.rows[0],'mean_frame_change_percent'));
});
