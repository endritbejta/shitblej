import { useMemo, useReducer } from "react";

export const SORTS = [
  { id: "relevance", label: "Recommended" },
  { id: "newest", label: "Newest first" },
  { id: "price-asc", label: "Price: low to high" },
  { id: "price-desc", label: "Price: high to low" },
];

const initial = { sort: "relevance", conditions: [], price: null };

function reducer(state, action) {
  switch (action.type) {
    case "sort":
      return { ...state, sort: action.value };
    case "toggleCondition":
      return {
        ...state,
        conditions: state.conditions.includes(action.value)
          ? state.conditions.filter((c) => c !== action.value)
          : [...state.conditions, action.value],
      };
    case "price":
      return { ...state, price: state.price?.id === action.value?.id ? null : action.value };
    case "clear":
      return { ...initial, sort: state.sort };
    default:
      return state;
  }
}

/**
 * Client-side filtering + sorting over a product list. Keeps browsing instant
 * (no refetch on every toggle) and returns everything the toolbar needs.
 */
export function useProductFilters(products) {
  const [filters, dispatch] = useReducer(reducer, initial);

  // Distinct conditions actually present in the data, for the condition filter.
  const availableConditions = useMemo(() => {
    const set = new Set();
    products.forEach((p) => p.condition && set.add(p.condition));
    return [...set].sort();
  }, [products]);

  const filtered = useMemo(() => {
    let list = products.filter((p) => {
      if (filters.conditions.length && !filters.conditions.includes(p.condition)) return false;
      if (filters.price) {
        const { min, max } = filters.price;
        if (min != null && p.price < min) return false;
        if (max != null && p.price > max) return false;
      }
      return true;
    });

    const by = {
      "price-asc": (a, b) => a.price - b.price,
      "price-desc": (a, b) => b.price - a.price,
      newest: (a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0),
    }[filters.sort];

    return by ? [...list].sort(by) : list;
  }, [products, filters]);

  const activeCount = filters.conditions.length + (filters.price ? 1 : 0);

  return {
    filters,
    filtered,
    availableConditions,
    activeCount,
    setSort: (value) => dispatch({ type: "sort", value }),
    toggleCondition: (value) => dispatch({ type: "toggleCondition", value }),
    setPrice: (value) => dispatch({ type: "price", value }),
    clear: () => dispatch({ type: "clear" }),
  };
}
