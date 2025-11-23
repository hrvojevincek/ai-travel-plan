"use client";

import { useState } from "react";
import { ArrowRight } from "lucide-react";


function SearchForm() {
    const [searchData, setSearchData] = useState({
        destination: "",
        duration: "",
        preferences: "",
    });

    return (
        <form
            className="space-y-3"
            onSubmit={() => { }}
        >
            <div>
                <div className="mt-3">
                    <input
                        onChange={() => { }}
                        value={searchData.destination}
                        id="destination"
                        name="destination"
                        type="text"
                        required
                        placeholder="Where do you want to go? Enter a city name."
                        className="w-96 text-center rounded-full py-2 px-4 bg-opacity-70 bg-neutral-100 placeholder-icon-time"
                    />
                </div>
            </div>

            <div>
                <div className="mt-2">
                    <input
                        onChange={() => { }}
                        value={searchData.duration}
                        id="duration"
                        name="duration"
                        type="number"
                        min="2"
                        max="4"
                        placeholder="How many days for?"
                        required
                        className="w-96 text-center rounded-full py-2 px-4 bg-opacity-70 bg-neutral-100 placeholder-icon-time"
                    />
                </div>
            </div>

            <div className="pt-4 flex items-center gap-8 justify-between">
                <button
                    type="button"
                    onClick={() => { }}
                    className=" bg-yellow-400 text-white p-2 px-4 rounded-full"
                >
                    Sign In
                </button>
                <button className="font-bold bg-slate-900 p-2 px-8   text-white rounded-full">
                    <ArrowRight className="h-6 w-6 text-white" />
                </button>
            </div>
        </form>
    );
}

export default SearchForm;
