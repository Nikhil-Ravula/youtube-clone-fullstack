"use client";

import React, { useState } from "react";

const categories = [
  "All",
  "Music",
  "Gaming",
  "Movies",
  "News",
  "Sports",
  "Technology",
  "Comedy",
  "Education",
  "Science",
  "Travel",
  "Food",
  "Fashion",
];

interface CategoryTabsProps {
  selectedCategory?: string;
  onSelectCategory?: (category: string) => void;
}

export default function CategoryTabs({
  selectedCategory,
  onSelectCategory,
}: CategoryTabsProps) {
  const [localCategory, setLocalCategory] = useState("All");
  const activeCategory = selectedCategory || localCategory;

  const handleSelect = (category: string) => {
    setLocalCategory(category);
    if (onSelectCategory) {
      onSelectCategory(category);
    }
  };

  return (
    <div className="flex gap-2 mb-6 overflow-x-auto pb-2 scrollbar-none">
      {categories.map((category) => {
        const isSelected = activeCategory === category;
        return (
          <button
            key={category}
            type="button"
            className={`whitespace-nowrap px-3.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
              isSelected
                ? "bg-zinc-900 text-white shadow-xs"
                : "bg-gray-100 hover:bg-gray-200 text-gray-800"
            }`}
            onClick={() => handleSelect(category)}
          >
            {category}
          </button>
        );
      })}
    </div>
  );
}

