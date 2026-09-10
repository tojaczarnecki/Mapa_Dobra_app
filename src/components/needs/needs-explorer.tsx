"use client";

import { useMemo, useState } from "react";
import { NeedCard } from "./need-card";

type Need = {
  id: string;
  title: string;
  peopleNeeded: number;
  responsesCount: number;
  startsAt: string;
  endsAt: string;
  experienceRequired: boolean;
  requirements: string | null;
  place: {
    name: string;
    city: string;
    addressLine: string;
    latitude: number | null;
    longitude: number | null;
  } | null;
  organization: { name: string };
};

type Filter = "TODAY" | "WEEKEND" | "NO_EXPERIENCE" | "NEAREST";
type UserLocation = { latitude: number; longitude: number };
type LocationStatus = "idle" | "loading" | "ready" | "unavailable";

function startOfDay(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();
}

function bucketFor(startsAt: string, now: Date) {
  const date = startOfDay(new Date(startsAt));
  const today = startOfDay(now);
  if (date === today) return "Dzisiaj";
  if (date === today + 86400000) return "Jutro";
  const daysToSaturday = now.getDay() === 0 ? 6 : 6 - now.getDay();
  const saturday = today + daysToSaturday * 86400000;
  if (date === saturday || date === saturday + 86400000) return "W ten weekend";
  return "Później";
}

function distanceKm(from: UserLocation, to: { latitude: number; longitude: number }) {
  const radius = 6371;
  const toRadians = (value: number) => (value * Math.PI) / 180;
  const dLatitude = toRadians(to.latitude - from.latitude);
  const dLongitude = toRadians(to.longitude - from.longitude);
  const latitude1 = toRadians(from.latitude);
  const latitude2 = toRadians(to.latitude);
  const a = Math.sin(dLatitude / 2) ** 2 + Math.cos(latitude1) * Math.cos(latitude2) * Math.sin(dLongitude / 2) ** 2;
  return radius * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function hasCoordinates(need: Need): need is Need & { place: NonNullable<Need["place"]> & { latitude: number; longitude: number } } {
  return need.place?.latitude !== null && need.place?.latitude !== undefined && need.place?.longitude !== null && need.place?.longitude !== undefined;
}

export function NeedsExplorer({ needs }: { needs: Need[] }) {
  const [filter, setFilter] = useState<Filter | null>(null);
  const [mobileExpanded, setMobileExpanded] = useState(false);
  const [visibleCount, setVisibleCount] = useState(8);
  const [userLocation, setUserLocation] = useState<UserLocation | null>(null);
  const [locationStatus, setLocationStatus] = useState<LocationStatus>("idle");
  const now = useMemo(() => new Date(), []);

  const filtered = useMemo(() => {
    const result = needs.filter((need) => {
      if (filter === "TODAY") return bucketFor(need.startsAt, now) === "Dzisiaj";
      if (filter === "WEEKEND") return bucketFor(need.startsAt, now) === "W ten weekend";
      if (filter === "NO_EXPERIENCE") return !need.experienceRequired;
      return true;
    });

    if (filter === "NEAREST" && userLocation) {
      return [...result].sort((left, right) => {
        const leftDistance = hasCoordinates(left)
          ? distanceKm(userLocation, { latitude: left.place.latitude, longitude: left.place.longitude })
          : Number.POSITIVE_INFINITY;
        const rightDistance = hasCoordinates(right)
          ? distanceKm(userLocation, { latitude: right.place.latitude, longitude: right.place.longitude })
          : Number.POSITIVE_INFINITY;
        return leftDistance - rightDistance;
      });
    }

    return result;
  }, [filter, needs, now, userLocation]);

  const visible = filtered.slice(0, visibleCount);
  const groups = filter === "NEAREST" ? ["Najbliżej"] : ["Dzisiaj", "Jutro", "W ten weekend", "Później"];

  function resetPaging() {
    setVisibleCount(8);
    setMobileExpanded(false);
  }

  function toggleFilter(value: Exclude<Filter, "NEAREST">) {
    setFilter((current) => current === value ? null : value);
    resetPaging();
  }

  function toggleNearest() {
    if (filter === "NEAREST") {
      setFilter(null);
      resetPaging();
      return;
    }

    if (userLocation) {
      setFilter("NEAREST");
      setLocationStatus("ready");
      resetPaging();
      return;
    }

    if (!navigator.geolocation) {
      setLocationStatus("unavailable");
      return;
    }

    setLocationStatus("loading");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setUserLocation({ latitude: position.coords.latitude, longitude: position.coords.longitude });
        setLocationStatus("ready");
        setFilter("NEAREST");
        resetPaging();
      },
      () => setLocationStatus("unavailable"),
      { enableHighAccuracy: false, timeout: 8000, maximumAge: 300000 },
    );
  }

  return (
    <div className="needs-explorer">
      <div className="needs-toolbar">
        <p className="needs-count">{needs.length} {needs.length === 1 ? "aktualna potrzeba w Łodzi" : "aktualnych potrzeb w Łodzi"}</p>
        <div className="needs-quick-filters" role="group" aria-label="Szybkie filtry">
          <button type="button" aria-pressed={filter === "TODAY"} onClick={() => toggleFilter("TODAY")} className={`needs-filter ${filter === "TODAY" ? "is-active" : ""}`}>Dziś</button>
          <button type="button" aria-pressed={filter === "WEEKEND"} onClick={() => toggleFilter("WEEKEND")} className={`needs-filter ${filter === "WEEKEND" ? "is-active" : ""}`}>Weekend</button>
          <button type="button" aria-pressed={filter === "NO_EXPERIENCE"} onClick={() => toggleFilter("NO_EXPERIENCE")} className={`needs-filter ${filter === "NO_EXPERIENCE" ? "is-active" : ""}`}>Bez doświadczenia</button>
          <button type="button" aria-pressed={filter === "NEAREST"} onClick={toggleNearest} className={`needs-filter ${filter === "NEAREST" ? "is-active" : ""}`} disabled={locationStatus === "loading"}>{locationStatus === "loading" ? "Ustalam lokalizację…" : "Najbliżej"}</button>
        </div>
      </div>

      {locationStatus === "unavailable" ? <p className="needs-filter-disclosure" role="status">Nie udało się ustalić lokalizacji. Możesz nadal korzystać z pozostałych filtrów.</p> : null}

      {visible.length ? (
        <div className={mobileExpanded ? "needs-list is-expanded" : "needs-list"}>
          {groups.map((group) => {
            const groupNeeds = filter === "NEAREST" ? visible : visible.filter((need) => bucketFor(need.startsAt, now) === group);
            return groupNeeds.length ? (
              <section key={group} className="needs-group" aria-labelledby={`needs-group-${group}`}>
                <h2 id={`needs-group-${group}`} className="needs-group-title"><span className="sm:hidden">{group === "W ten weekend" ? "Weekend" : group}</span><span className="hidden sm:inline">{group}</span></h2>
                {groupNeeds.map((need, index) => <div key={need.id} className={index >= 6 ? "needs-list-limited" : undefined}><NeedCard {...need} /></div>)}
              </section>
            ) : null;
          })}
        </div>
      ) : (
        <div className="needs-empty needs-empty-filtered">
          <h2>Nie znaleźliśmy potrzeb pasujących do tego filtra.</h2>
          <p>Wyczyść wybór i zobacz wszystkie aktualne ogłoszenia.</p>
          <button type="button" onClick={() => { setFilter(null); resetPaging(); }} className="needs-filter needs-filter-more">Wyczyść filtr</button>
        </div>
      )}

      {visibleCount < filtered.length || (!mobileExpanded && visible.length > 6) ? <button type="button" onClick={() => { setMobileExpanded(true); setVisibleCount((count) => count + 8); }} className="needs-load-more">Pokaż kolejne potrzeby</button> : null}
    </div>
  );
}
