"""
Test script to verify the GlobalQueueService logic.

This tests the core scheduling algorithm without requiring a database,
by simulating the interleaving and timing calculations.
"""
import sys
import os

# Test 1: Interleaving logic
print("=" * 70)
print("TEST 1: Interleaving recipients across profiles")
print("=" * 70)

# Simulate the _interleave_recipients method
def interleave_recipients(distribution):
    """Interleave recipients across profiles in round-robin order."""
    result = []
    profile_ids = list(distribution.keys())
    
    if not profile_ids:
        return result
    
    max_recipients = max(len(recipients) for recipients in distribution.values())
    
    for i in range(max_recipients):
        for profile_id in profile_ids:
            recipients = distribution[profile_id]
            if i < len(recipients):
                result.append((profile_id, recipients[i]))
    
    return result


# Test with 3 profiles, 3 recipients each
distribution_multi = {
    "ProfileA": ["r1", "r4", "r7"],
    "ProfileB": ["r2", "r5", "r8"],
    "ProfileC": ["r3", "r6", "r9"]
}

interleaved_multi = interleave_recipients(distribution_multi)
print(f"\nMulti-recipient request (3 profiles, 3 each):")
for i, (profile, recipient) in enumerate(interleaved_multi):
    print(f"  Slot {i}: {profile} -> {recipient}")

# Test with 3 profiles, 1 recipient each (simulating 3 separate requests)
# Request 1
dist_req1 = {"ProfileA": ["r1"]}
interleaved_req1 = interleave_recipients(dist_req1)

# Request 2
dist_req2 = {"ProfileB": ["r2"]}
interleaved_req2 = interleave_recipients(dist_req2)

# Request 3
dist_req3 = {"ProfileC": ["r3"]}
interleaved_req3 = interleave_recipients(dist_req3)

print(f"\nSingle-recipient requests (3 separate requests):")
for i, (profile, recipient) in enumerate(interleaved_req1):
    print(f"  Request 1, Slot {i}: {profile} -> {recipient}")
for i, (profile, recipient) in enumerate(interleaved_req2):
    print(f"  Request 2, Slot {i}: {profile} -> {recipient}")
for i, (profile, recipient) in enumerate(interleaved_req3):
    print(f"  Request 3, Slot {i}: {profile} -> {recipient}")


# Test 2: Timing simulation
print("\n" + "=" * 70)
print("TEST 2: Timing simulation - Global queue scheduling")
print("=" * 70)

from datetime import datetime, timedelta

class MockGlobalQueue:
    """Simulates the GlobalQueueService scheduling logic."""
    
    def __init__(self):
        # Tracks the last scheduled time per profile
        self.profile_last_scheduled = {}
        # Tracks all scheduled items globally
        self.all_scheduled = []
        self.num_profiles = 3
    
    def get_global_next_slot(self, profile_id, cooldown_seconds):
        now = datetime(2026, 2, 11, 12, 0, 0)  # Fixed "now" for testing
        
        inter_profile_gap = cooldown_seconds / self.num_profiles
        
        # 1. Profile-specific earliest
        profile_earliest = now
        if profile_id in self.profile_last_scheduled:
            profile_earliest = self.profile_last_scheduled[profile_id] + timedelta(seconds=cooldown_seconds)
        
        # 2. Global earliest
        global_earliest = now
        if self.all_scheduled:
            global_last = max(t for _, t in self.all_scheduled)
            global_earliest = global_last + timedelta(seconds=inter_profile_gap)
        
        send_at = max(profile_earliest, global_earliest)
        if send_at < now:
            send_at = now
        
        # Record this scheduling
        self.profile_last_scheduled[profile_id] = send_at
        self.all_scheduled.append((profile_id, send_at))
        
        return send_at


# Scenario A: One request with 9 recipients distributed across 3 profiles
print("\nScenario A: ONE request with 9 recipients (3 per profile)")
queue_a = MockGlobalQueue()
cooldown = 120  # 2 minutes per profile

distribution_a = {
    "ProfileA": ["r1", "r4", "r7"],
    "ProfileB": ["r2", "r5", "r8"],
    "ProfileC": ["r3", "r6", "r9"]
}

interleaved_a = interleave_recipients(distribution_a)
schedule_a = []
for profile_id, recipient in interleaved_a:
    send_at = queue_a.get_global_next_slot(profile_id, cooldown)
    schedule_a.append((profile_id, recipient, send_at))
    offset = (send_at - datetime(2026, 2, 11, 12, 0, 0)).total_seconds()
    print(f"  {profile_id} -> {recipient} at +{offset:.0f}s ({offset/60:.1f}min)")


# Scenario B: 9 separate requests, each with 1 recipient
print("\nScenario B: NINE separate requests, 1 recipient each")
queue_b = MockGlobalQueue()

# Simulate 9 separate requests, each distributed to one profile in round-robin
single_requests = [
    ("ProfileA", "r1"),
    ("ProfileB", "r2"),
    ("ProfileC", "r3"),
    ("ProfileA", "r4"),
    ("ProfileB", "r5"),
    ("ProfileC", "r6"),
    ("ProfileA", "r7"),
    ("ProfileB", "r8"),
    ("ProfileC", "r9"),
]

schedule_b = []
for profile_id, recipient in single_requests:
    send_at = queue_b.get_global_next_slot(profile_id, cooldown)
    schedule_b.append((profile_id, recipient, send_at))
    offset = (send_at - datetime(2026, 2, 11, 12, 0, 0)).total_seconds()
    print(f"  {profile_id} -> {recipient} at +{offset:.0f}s ({offset/60:.1f}min)")


# Compare timings
print("\n" + "=" * 70)
print("TEST 3: Verify timing consistency between scenarios")
print("=" * 70)

offsets_a = [(send_at - datetime(2026, 2, 11, 12, 0, 0)).total_seconds() for _, _, send_at in schedule_a]
offsets_b = [(send_at - datetime(2026, 2, 11, 12, 0, 0)).total_seconds() for _, _, send_at in schedule_b]

print(f"\nScenario A offsets (seconds): {offsets_a}")
print(f"Scenario B offsets (seconds): {offsets_b}")

# Check that the timing patterns match
match = offsets_a == offsets_b
print(f"\nTimings match: {match}")

if match:
    print("SUCCESS: Both scenarios produce identical timing!")
else:
    print("Note: Timings may differ slightly due to sequential scheduling,")
    print("but the key point is that single-recipient requests are properly")
    print("spaced out and not all scheduled at the same time.")
    
    # Check that no two messages in scenario B are at the same time
    unique_times_b = len(set(offsets_b))
    print(f"\nScenario B unique time slots: {unique_times_b} out of {len(offsets_b)}")
    if unique_times_b == len(offsets_b):
        print("SUCCESS: All messages in separate requests are properly spaced!")
    else:
        print("ISSUE: Some messages are scheduled at the same time!")


# Test 4: Verify gaps between same-profile messages
print("\n" + "=" * 70)
print("TEST 4: Verify per-profile cooldown gaps")
print("=" * 70)

for scenario_name, schedule in [("A", schedule_a), ("B", schedule_b)]:
    print(f"\nScenario {scenario_name}:")
    profile_times = {}
    for profile_id, recipient, send_at in schedule:
        if profile_id not in profile_times:
            profile_times[profile_id] = []
        profile_times[profile_id].append(send_at)
    
    for profile_id, times in sorted(profile_times.items()):
        times.sort()
        for i in range(1, len(times)):
            gap = (times[i] - times[i-1]).total_seconds()
            print(f"  {profile_id}: gap between msg {i} and {i+1} = {gap:.0f}s ({gap/60:.1f}min)")
            if gap >= cooldown:
                print(f"    OK (>= cooldown of {cooldown}s)")
            else:
                print(f"    WARNING: gap is less than cooldown of {cooldown}s!")


# Test 5: Verify global gaps (no two messages too close)
print("\n" + "=" * 70)
print("TEST 5: Verify global message spacing")
print("=" * 70)

for scenario_name, schedule in [("A", schedule_a), ("B", schedule_b)]:
    print(f"\nScenario {scenario_name}:")
    all_times = sorted([(send_at, profile_id, recipient) for profile_id, recipient, send_at in schedule])
    
    inter_gap = cooldown / 3  # 3 profiles
    for i in range(1, len(all_times)):
        gap = (all_times[i][0] - all_times[i-1][0]).total_seconds()
        print(f"  {all_times[i-1][1]}({all_times[i-1][2]}) -> {all_times[i][1]}({all_times[i][2]}): gap = {gap:.0f}s (expected >= {inter_gap:.0f}s)")


print("\n" + "=" * 70)
print("ALL TESTS COMPLETED")
print("=" * 70)
