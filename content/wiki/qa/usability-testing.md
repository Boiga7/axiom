---
type: concept
category: qa
para: resource
tags: [usability, ux, user-testing, heuristics, cognitive-walkthrough, a-b-testing]
sources: []
updated: 2026-05-01
---

# Usability Testing

Evaluating a product by testing it with real users to find where the interface confuses, frustrates, or fails them. Distinct from functional testing — you're testing whether the product can be used effectively, not whether it works correctly.

---

## Why Usability Testing

```
Functional QA answers: "Does it work?"
Usability testing answers: "Can people actually use it?"

A product can be functionally perfect but fail users:
  - Users can't find the checkout button (discovered the hard way)
  - Error messages don't explain how to recover
  - Form validation fires before the user finishes typing
  - Mobile keyboard covers the input field being typed into

ROI: finding usability issues in testing is 100x cheaper than fixing them
after release when users have already churned.
```

---

## Nielsen's 10 Heuristics

```
1. Visibility of system status — always tell users what's happening
   Bad: submit button disappears with no feedback
   Good: "Processing your order..." with a spinner

2. Match between system and real world — use user language, not jargon
   Bad: "Null pointer exception on invoice object"
   Good: "We couldn't process your payment. Please check your card details."

3. User control and freedom — easy undo, easy exit
   Bad: "Are you sure?" with no way to cancel
   Good: "Undo" available for 30 seconds after delete

4. Consistency and standards — follow platform conventions
   Bad: Back button navigates forward on mobile
   Good: Back = go back everywhere, always

5. Error prevention — prevent problems before they occur
   Bad: Allow form submission with incomplete required fields
   Good: Disable submit until all required fields filled

6. Recognition over recall — don't make users remember
   Bad: "Enter the code from the previous screen"
   Good: Show the code on the same screen

7. Flexibility and efficiency — shortcuts for expert users
   Bad: 8 clicks to complete a frequent action
   Good: Keyboard shortcut for frequent action

8. Aesthetic and minimalist design — only show what's needed now
   Bad: 30 fields visible when user only needs 3 for this task
   Good: Progressive disclosure — show advanced options on demand

9. Help users recognise, diagnose, and recover from errors
   Bad: "Error 422"
   Good: "Your email address needs the @ symbol"

10. Help and documentation — available when needed
    Bad: Help link goes to home page
    Good: Context-sensitive help links to the exact relevant doc
```

---

## Moderated User Testing Protocol

```
Preparation (1 week before):
  - Write 4-6 task scenarios (realistic, not step-by-step instructions)
    Good: "You received a package that was damaged. Get a refund."
    Bad: "Click Returns, then click New Return, then select Damaged Item"
  - Recruit 5-8 participants matching your user persona
    (5 users find 85% of usability issues — Jakob Nielsen's rule)
  - Set up screen recording (Lookback, UserZoom, or Zoom + consent)

Session structure (60 minutes):
  - Introduction (5 min): explain think-aloud protocol, no wrong answers
  - Warm-up (5 min): background questions, general product familiarity
  - Tasks (40 min): observe silently; ask "what are you thinking?" not "why"
  - Debrief (10 min): open questions about overall experience

During session:
  - Don't help unless user is completely stuck (threshold: 3+ minutes)
  - Record timestamps of hesitations, errors, confusion, success
  - Note facial expressions, sighs, "oh"s — non-verbal signal something's off

Analysis:
  - Create issue list from recordings (not impressions)
  - Rate severity: Critical (blocks task) / Serious (significant delay) / Minor
  - Present top 5 issues with video clips — far more persuasive than reports
```

---

## Unmoderated Remote Testing

```python
# UserTesting.com / Maze API — automated usability tests

# Define a test scenario
test = {
    "name": "Checkout flow usability test",
    "tasks": [
        {
            "description": "You want to buy a Widget Pro. Add it to your cart and complete the purchase.",
            "success_criteria": "order_confirmation_page_reached",
        }
    ],
    "metrics": ["completion_rate", "time_on_task", "error_rate", "satisfaction"],
    "participants": {"count": 20, "panel": "general_population"},
}

# Key metrics to track
USABILITY_BENCHMARKS = {
    "task_completion_rate": 0.85,   # 85% complete the task
    "avg_time_on_task": 120,        # under 2 minutes
    "error_rate": 0.10,             # under 10% make an error
    "system_usability_scale": 68,   # SUS score > 68 = above average
}
```

---

## System Usability Scale (SUS)

```python
# SUS — 10-question standardised questionnaire
# Each item: 1 (strongly disagree) to 5 (strongly agree)
# Odd items: positive (score - 1)
# Even items: negative (5 - score)
# Final score: sum of responses × 2.5 → scale 0-100

SUS_QUESTIONS = [
    "I think that I would like to use this system frequently",                    # positive
    "I found the system unnecessarily complex",                                   # negative
    "I thought the system was easy to use",                                      # positive
    "I think that I would need the support of a technical person to use this",   # negative
    "I found the various functions in this system were well integrated",          # positive
    "I thought there was too much inconsistency in this system",                 # negative
    "I would imagine that most people would learn to use this system very quickly",# positive
    "I found the system very cumbersome to use",                                 # negative
    "I felt very confident using the system",                                    # positive
    "I needed to learn a lot of things before I could get going with this system",# negative
]

def calculate_sus(responses: list[int]) -> float:
    assert len(responses) == 10
    score = 0
    for i, response in enumerate(responses):
        if i % 2 == 0:  # odd questions (0-indexed even)
            score += response - 1
        else:           # even questions
            score += 5 - response
    return score * 2.5

# Interpretation:
# > 80.3: Excellent (grade A)
# 68-80.3: Good (grade B/C)
# 51-68: OK (grade C/D)
# < 51: Poor (grade F)
```

---

## A/B Testing for UX Decisions

```python
# Track conversion rates between two UI variants
from myapp.flags import get_variant

@app.get("/checkout")
async def checkout_page(user: User):
    variant = get_variant("checkout_button_color", user_id=user.id)
    # "control": blue button, "treatment": green button

    track_event("checkout_page_viewed", {
        "user_id": user.id,
        "variant": variant,
    })

    return render_checkout(button_color="blue" if variant == "control" else "green")

# After sufficient data (typically 2 weeks, statistical significance p < 0.05):
# Measure: checkout completion rate, time to complete
# Decision rule: if treatment is +5% completion with p < 0.05, ship it
```

---

## Connections
[[qa-hub]] · [[qa/exploratory-testing]] · [[qa/non-functional-testing]] · [[qa/accessibility-testing]] · [[qa/uat]] · [[qa/test-strategy]]
