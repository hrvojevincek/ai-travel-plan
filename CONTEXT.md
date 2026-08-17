# Voyago

AI travel planner: a generated Trip of real-world Activities, optionally pinned on a map.

## Language

**Trip**:
A planned visit to a destination, made of ordered Days.
_Avoid_: itinerary, plan, vacation

**Day**:
One calendar day on a Trip, holding a fixed sequence of Activities.

**Activity**:
A stop on a Day — breakfast, lunch, dinner, or something to do — with a name, address, and duration.
_Avoid_: place, POI, stop (except in prose); food/other as types

**Place lookup**:
Attaching a real-world place (coordinates, place identity, photo) to an Activity from its name, address, and destination. A miss is a valid outcome: the Activity still exists without a pin.
_Avoid_: grounding, geocoding

**Grounding**:
A generated Trip after place lookup, including LLM replacement of Activities that could not be found.
_Avoid_: using “grounding” for a single Places call
