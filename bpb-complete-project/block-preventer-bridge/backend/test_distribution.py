"""
Test script to verify the queue-aware distribution logic.

Simulates the round-robin distribution with pending queue counts
to verify that single-recipient requests are properly distributed.
"""

print("=" * 70)
print("TEST: Queue-aware Round-Robin Distribution")
print("=" * 70)


def round_robin_distribute(profile_ids, recipients, sent_today_map, pending_counts, daily_limit=240):
    """Simulate the new queue-aware round-robin distribution."""
    distribution = {pid: [] for pid in profile_ids}
    num_profiles = len(profile_ids)
    
    # Calculate total load per profile
    profile_loads = []
    for pid in profile_ids:
        sent = sent_today_map.get(pid, 0)
        pending = pending_counts.get(pid, 0)
        total_load = sent + pending
        profile_loads.append((pid, total_load))
    
    # Total messages determines the round-robin offset
    total_messages = sum(load for _, load in profile_loads)
    start_offset = total_messages % num_profiles
    
    print(f"  Total messages across profiles: {total_messages}")
    print(f"  Start offset: {start_offset}")
    print(f"  Profile loads: {profile_loads}")
    
    for i, recipient in enumerate(recipients):
        idx = (start_offset + i) % num_profiles
        pid = profile_ids[idx]
        sent = sent_today_map.get(pid, 0)
        pending = pending_counts.get(pid, 0)
        
        if sent + pending + len(distribution[pid]) < daily_limit:
            distribution[pid].append(recipient)
        else:
            # Find alternative
            for j in range(num_profiles):
                alt_idx = (idx + j + 1) % num_profiles
                alt_pid = profile_ids[alt_idx]
                alt_sent = sent_today_map.get(alt_pid, 0)
                alt_pending = pending_counts.get(alt_pid, 0)
                if alt_sent + alt_pending + len(distribution[alt_pid]) < daily_limit:
                    distribution[alt_pid].append(recipient)
                    break
    
    return {k: v for k, v in distribution.items() if v}


# Scenario: Fresh start, no pending items
print("\n--- Scenario 1: Multi-recipient request (4 recipients, 2 profiles, fresh) ---")
profiles = ["ProfileA", "ProfileB"]
result = round_robin_distribute(
    profiles,
    ["r1", "r2", "r3", "r4"],
    {"ProfileA": 0, "ProfileB": 0},
    {"ProfileA": 0, "ProfileB": 0}
)
print(f"  Result: {result}")
print(f"  Expected: A gets r1,r3 and B gets r2,r4")

# Scenario: 4 separate single-recipient requests
print("\n--- Scenario 2: Four separate single-recipient requests (fresh start) ---")
pending = {"ProfileA": 0, "ProfileB": 0}
sent = {"ProfileA": 0, "ProfileB": 0}

for i, recipient in enumerate(["r1", "r2", "r3", "r4"]):
    result = round_robin_distribute(
        profiles,
        [recipient],
        sent.copy(),
        pending.copy()
    )
    assigned_to = list(result.keys())[0] if result else "NONE"
    print(f"  Request {i+1}: {recipient} -> {assigned_to}")
    
    # Simulate the queue item being added (pending count increases)
    pending[assigned_to] = pending.get(assigned_to, 0) + 1

print(f"\n  Final pending counts: {pending}")
print(f"  Expected: A=2, B=2 (evenly distributed)")


# Scenario: With existing load
print("\n--- Scenario 3: Existing load (A has 46 sent, B has 48 sent) ---")
pending = {"ProfileA": 0, "ProfileB": 0}
sent = {"ProfileA": 46, "ProfileB": 48}

for i, recipient in enumerate(["r1", "r2", "r3", "r4", "r5", "r6"]):
    result = round_robin_distribute(
        profiles,
        [recipient],
        sent.copy(),
        pending.copy()
    )
    assigned_to = list(result.keys())[0] if result else "NONE"
    print(f"  Request {i+1}: {recipient} -> {assigned_to}")
    pending[assigned_to] = pending.get(assigned_to, 0) + 1

print(f"\n  Final pending counts: {pending}")
print(f"  Expected: Roughly even distribution")


# Scenario: 3 profiles
print("\n--- Scenario 4: Three profiles, 6 separate requests ---")
profiles3 = ["ProfileA", "ProfileB", "ProfileC"]
pending3 = {"ProfileA": 0, "ProfileB": 0, "ProfileC": 0}
sent3 = {"ProfileA": 10, "ProfileB": 10, "ProfileC": 10}

for i, recipient in enumerate(["r1", "r2", "r3", "r4", "r5", "r6"]):
    result = round_robin_distribute(
        profiles3,
        [recipient],
        sent3.copy(),
        pending3.copy()
    )
    assigned_to = list(result.keys())[0] if result else "NONE"
    print(f"  Request {i+1}: {recipient} -> {assigned_to}")
    pending3[assigned_to] = pending3.get(assigned_to, 0) + 1

print(f"\n  Final pending counts: {pending3}")
print(f"  Expected: A=2, B=2, C=2 (perfectly even)")


# Scenario: Compare multi vs single
print("\n--- Scenario 5: Verify multi-recipient matches single-recipient pattern ---")
print("\n  Multi-recipient (6 recipients at once):")
result_multi = round_robin_distribute(
    profiles3,
    ["r1", "r2", "r3", "r4", "r5", "r6"],
    {"ProfileA": 10, "ProfileB": 10, "ProfileC": 10},
    {"ProfileA": 0, "ProfileB": 0, "ProfileC": 0}
)
for pid, recips in sorted(result_multi.items()):
    print(f"    {pid}: {recips}")

print("\n  Single-recipient (6 separate requests):")
pending5 = {"ProfileA": 0, "ProfileB": 0, "ProfileC": 0}
sent5 = {"ProfileA": 10, "ProfileB": 10, "ProfileC": 10}
single_results = {"ProfileA": [], "ProfileB": [], "ProfileC": []}

for recipient in ["r1", "r2", "r3", "r4", "r5", "r6"]:
    result = round_robin_distribute(
        profiles3,
        [recipient],
        sent5.copy(),
        pending5.copy()
    )
    assigned_to = list(result.keys())[0]
    single_results[assigned_to].append(recipient)
    pending5[assigned_to] = pending5.get(assigned_to, 0) + 1

for pid, recips in sorted(single_results.items()):
    print(f"    {pid}: {recips}")

# Check if distributions match
match = all(
    sorted(result_multi.get(pid, [])) == sorted(single_results.get(pid, []))
    for pid in profiles3
)
print(f"\n  Distributions match: {match}")

if match:
    print("  SUCCESS: Multi-recipient and single-recipient produce identical distribution!")
else:
    print("  Note: Distribution may differ in order but should be balanced.")
    for pid in profiles3:
        multi_count = len(result_multi.get(pid, []))
        single_count = len(single_results.get(pid, []))
        print(f"    {pid}: multi={multi_count}, single={single_count}")


print("\n" + "=" * 70)
print("ALL DISTRIBUTION TESTS COMPLETED")
print("=" * 70)
