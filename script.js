let parsedData = [];

let searchDataForEntire = "";
let searchDataForPriceReviewChanges = "";
let priceReviewChangesData = [];
let chartInstance;
const itemsPerPage = 5;
let currentParsedPage = 1;
let currentChangesPage = 1;

let filteredData = [];

let filteredParsedData = [];
let filteredPriceReviewData = [];

// To hold the current search terms
let currentSearchParsedData = "";
let currentSearchPriceReview = "";

let priceReviewChangesSortType = "";
let priceReviewChangesSortOrder = "";

let parsedDataSortType = "";
let parsedDataSortOrder = "";

let parsedDataStatusFilter = { korean: true, not_korean: true, unknown: true };

const valueToFilterKeyMap = {
  korean: "korean",
  "not korean": "not_korean",
  unknown: "unknown",
};

let startDateForParsedData = "";
let endDateForParsedData = "";

function renderParsedDataTable(
  searchData,
  statusFilterData = null,
  sortData = null,
  dateData = null
) {
  const filteredParsedData = parsedData.filter((item) => {
    // Check if ASIN or title matches the search query
    const asinMatches = item.asin
      .toLowerCase()
      .includes(searchData.toLowerCase());
    const titleMatches = item.title
      .toLowerCase()
      .includes(searchData.toLowerCase());

    // Check if status matches the filter
    let statusMatches = true;
    if (statusFilterData) {
      const normalizedStatus = item.status
        ? item.status.toLowerCase()
        : "unknown";
      statusMatches = statusFilterData[valueToFilterKeyMap[normalizedStatus]];
    }

    // Check if the item's utcTime falls within the date range
    let dateMatches = true;
    if (dateData && dateData.startDate && dateData.endDate) {
      const itemDate = new Date(item.utcTime);
      const startDate = new Date(dateData.startDate);
      const endDate = new Date(dateData.endDate);

      // Extract year, month, day for comparison
      const itemYear = itemDate.getFullYear();
      const itemMonth = itemDate.getMonth(); // Note: getMonth() is zero-based (January is 0)
      const itemDay = itemDate.getDate();

      const startYear = startDate.getFullYear();
      const startMonth = startDate.getMonth();
      const startDay = startDate.getDate();

      const endYear = endDate.getFullYear();
      const endMonth = endDate.getMonth();
      const endDay = endDate.getDate();

      // Compare dates (only year, month, and day)
      dateMatches =
        (itemYear > startYear ||
          (itemYear === startYear &&
            (itemMonth > startMonth ||
              (itemMonth === startMonth && itemDay >= startDay)))) &&
        (itemYear < endYear ||
          (itemYear === endYear &&
            (itemMonth < endMonth ||
              (itemMonth === endMonth && itemDay <= endDay))));
    }

    // Return true if ASIN/title matches, status matches, and the date is within the range
    return (asinMatches || titleMatches) && statusMatches && dateMatches;
  });

  // Sort logic (optional)
  if (sortData) {
    const { sortType, sortOrder } = sortData;
    if (sortType === "price") {
      filteredParsedData.sort((a, b) => {
        const priceA = parsePrice(a.price);
        const priceB = parsePrice(b.price);
        return sortOrder === "asc" ? priceA - priceB : priceB - priceA;
      });
    } else if (sortType === "reviews") {
      filteredParsedData.sort((a, b) => {
        const reviewsA = parseInt(a.reviews, 10) || 0;
        const reviewsB = parseInt(b.reviews, 10) || 0;
        return sortOrder === "asc" ? reviewsA - reviewsB : reviewsB - reviewsA;
      });
    }
  }

  // Pagination logic
  const start = (currentParsedPage - 1) * itemsPerPage;
  const end = start + itemsPerPage;
  const paginatedData = filteredParsedData.slice(start, end);

  const parsedDataTableBody = document.querySelector("#parsedDataTable tbody");
  parsedDataTableBody.innerHTML = "";

  // Rendering table rows with the filtered and paginated data
  paginatedData.forEach((item) => {
    const highlightedAsin = item.asin.replace(
      new RegExp(searchData, "gi"),
      (match) => `<span class="highlight">${match}</span>`
    );

    const highlightedTitle = item.title.replace(
      new RegExp(searchData, "gi"),
      (match) => `<span class="highlight">${match}</span>`
    );

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${highlightedAsin}</td>
      <td>${highlightedTitle}</td>
      <td>${item.price !== undefined ? item.price : "N/A"}</td>
      <td>${item.reviews !== undefined ? item.reviews : "N/A"}</td>
      <td>${item.status || "Unknown"}</td>
      <td>${item.searchQuery}</td>
      <td>${item.currencySymbol}</td>
      <td>${item.currency}</td>
      <td>${new Date(item.utcTime).toLocaleDateString()}</td>
      <td>${item.timeType}</td>
      <td>${item?.categories}</td>
    `;
    parsedDataTableBody.appendChild(tr);
  });

  // Render pagination controls
  renderPagination(
    filteredParsedData.length,
    currentParsedPage,
    "#parsedDataPagination",
    "parsed"
  );
}

function parsePrice(price) {
  if (!price || typeof price !== "string") return 0;
  const cleanedPrice = price.replace(/[$,]/g, "");
  const parsedValue = parseFloat(cleanedPrice);
  return isNaN(parsedValue) ? 0 : parsedValue;
}

function renderChangesTable(searchData, sortData = null) {
  const filteredPriceReviewData = priceReviewChangesData.filter((item) => {
    const asinMatches = item.asin
      .toLowerCase()
      .includes(searchData.toLowerCase());
    const titleMatches = item.title
      .toLowerCase()
      .includes(searchData.toLowerCase());
    return asinMatches || titleMatches;
  });

  if (sortData.sortType && sortData.sortOrder) {
    filteredPriceReviewData.sort((a, b) => {
      let comparison = 0;

      // Function to handle N/A values
      const parseChange = (value) => {
        if (value === "N/A") return -Infinity; // Treat "N/A" as the lowest value
        return parseFloat(value);
      };

      if (sortData.sortType === "price-change") {
        comparison = parseChange(a.priceChange) - parseChange(b.priceChange);
      } else if (sortData.sortType === "reviews-change") {
        comparison =
          parseChange(a.reviewsChange) - parseChange(b.reviewsChange);
      }

      return sortData.sortOrder === "asc" ? comparison : -comparison;
    });
  }

  const start = (currentChangesPage - 1) * itemsPerPage;
  const end = start + itemsPerPage;
  const paginatedData = filteredPriceReviewData.slice(start, end);

  const changesTableBody = document.querySelector("#changesTable tbody");
  changesTableBody.innerHTML = "";

  paginatedData.forEach((item) => {
    const highlightedAsin = item.asin.replace(
      new RegExp(searchData, "gi"),
      (match) => `<span class="highlight">${match}</span>`
    );

    const highlightedTitle = item.title.replace(
      new RegExp(searchData, "gi"),
      (match) => `<span class="highlight">${match}</span>`
    );

    const tr = document.createElement("tr");
    tr.innerHTML = `<td>${highlightedAsin}</td>
                    <td>${highlightedTitle}</td>
                    <td>${item.priceChange}</td>
                    <td>${item.reviewsChange}</td>
                    <td>${item.period}</td>
                    <td><button onclick="showModal('${item.asin}')">View Changes</button></td>`;
    changesTableBody.appendChild(tr);
  });

  renderPagination(
    filteredPriceReviewData.length,
    currentChangesPage,
    "#changePagination",
    "changes"
  );
}

function renderPagination(totalItems, currentPage, paginationSelector, type) {
  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const paginationContainer = document.querySelector(paginationSelector);
  paginationContainer.innerHTML = "";

  const maxButtons = 5;
  let startPage, endPage;

  if (totalPages <= maxButtons) {
    startPage = 1;
    endPage = totalPages;
  } else {
    const halfMaxButtons = Math.floor(maxButtons / 2);
    if (currentPage <= halfMaxButtons) {
      startPage = 1;
      endPage = maxButtons;
    } else if (currentPage + halfMaxButtons >= totalPages) {
      startPage = totalPages - maxButtons + 1;
      endPage = totalPages;
    } else {
      startPage = currentPage - halfMaxButtons;
      endPage = currentPage + halfMaxButtons;
    }
  }

  if (currentPage > 1) {
    const firstButton = document.createElement("button");
    firstButton.textContent = "First";
    firstButton.addEventListener("click", () => {
      if (type === "parsed") {
        currentParsedPage = 1;
        renderParsedDataTable(
          currentSearchParsedData,
          parsedDataStatusFilter,
          {
            sortType: parsedDataSortType,
            sortOrder: parsedDataSortOrder,
          },
          {
            startDate: startDateForParsedData,
            endDate: endDateForParsedData,
          }
        );
      } else {
        currentChangesPage = 1;

        renderChangesTable(currentSearchPriceReview, {
          sortType: priceReviewChangesSortType,
          sortOrder: priceReviewChangesSortOrder,
        });
      }
    });
    paginationContainer.appendChild(firstButton);
  }

  if (currentPage > 1) {
    const prevButton = document.createElement("button");
    prevButton.textContent = "Prev";
    prevButton.addEventListener("click", () => {
      if (type === "parsed") {
        currentParsedPage = currentPage - 1;
        renderParsedDataTable(
          currentSearchParsedData,
          parsedDataStatusFilter,
          {
            sortType: parsedDataSortType,
            sortOrder: parsedDataSortOrder,
          },
          {
            startDate: startDateForParsedData,
            endDate: endDateForParsedData,
          }
        );
      } else {
        currentChangesPage = currentPage - 1;

        renderChangesTable(currentSearchPriceReview, {
          sortType: priceReviewChangesSortType,
          sortOrder: priceReviewChangesSortOrder,
        });
      }
    });
    paginationContainer.appendChild(prevButton);
  }

  for (let i = startPage; i <= endPage; i++) {
    const pageButton = document.createElement("button");
    pageButton.textContent = i;
    pageButton.classList.add("page-button");
    if (i === currentPage) {
      pageButton.classList.add("active");
    }
    pageButton.addEventListener("click", () => {
      if (type === "parsed") {
        currentParsedPage = i;
        renderParsedDataTable(
          currentSearchParsedData,
          parsedDataStatusFilter,
          {
            sortType: parsedDataSortType,
            sortOrder: parsedDataSortOrder,
          },
          {
            startDate: startDateForParsedData,
            endDate: endDateForParsedData,
          }
        );
      } else {
        currentChangesPage = i;

        renderChangesTable(currentSearchPriceReview, {
          sortType: priceReviewChangesSortType,
          sortOrder: priceReviewChangesSortOrder,
        });
      }
    });
    paginationContainer.appendChild(pageButton);
  }

  if (currentPage < totalPages) {
    const nextButton = document.createElement("button");
    nextButton.textContent = "Next";
    nextButton.addEventListener("click", () => {
      if (type === "parsed") {
        currentParsedPage = currentPage + 1;
        renderParsedDataTable(
          currentSearchParsedData,
          parsedDataStatusFilter,
          {
            sortType: parsedDataSortType,
            sortOrder: parsedDataSortOrder,
          },
          {
            startDate: startDateForParsedData,
            endDate: endDateForParsedData,
          }
        );
      } else {
        currentChangesPage = currentPage + 1;

        renderChangesTable(currentSearchPriceReview, {
          sortType: priceReviewChangesSortType,
          sortOrder: priceReviewChangesSortOrder,
        });
      }
    });
    paginationContainer.appendChild(nextButton);
  }

  if (currentPage < totalPages) {
    const lastButton = document.createElement("button");
    lastButton.textContent = "Last";
    lastButton.addEventListener("click", () => {
      if (type === "parsed") {
        currentParsedPage = totalPages;
        renderParsedDataTable(
          currentSearchParsedData,
          parsedDataStatusFilter,
          {
            sortType: parsedDataSortType,
            sortOrder: parsedDataSortOrder,
          },
          {
            startDate: startDateForParsedData,
            endDate: endDateForParsedData,
          }
        );
      } else {
        currentChangesPage = totalPages;

        renderChangesTable(currentSearchPriceReview, {
          sortType: priceReviewChangesSortType,
          sortOrder: priceReviewChangesSortOrder,
        });
      }
    });
    paginationContainer.appendChild(lastButton);
  }
}

function calculatePriceReviewChanges(startDate, endDate) {
  const changes = {};

  parsedData.forEach((item) => {
    const itemDate = new Date(item.utcTime);
    if (itemDate >= startDate && itemDate <= endDate) {
      if (!changes[item.asin]) {
        changes[item.asin] = {
          title: item.title,
          prices: [],
          reviews: [],
        };
      }
      changes[item.asin].prices.push(parseFloat(item.price.replace("$", "")));
      changes[item.asin].reviews.push(parseInt(item.reviews));
    }
  });

  return Object.entries(changes).map(([asin, data]) => {
    const priceChange = calculatePercentageChange(data.prices);
    const reviewsChange = calculatePercentageChange(data.reviews);
    return {
      asin,
      title: data.title,
      priceChange,
      reviewsChange,
      period: `${startDate.toLocaleDateString()} - ${endDate.toLocaleDateString()}`,
    };
  });
}

function calculatePercentageChange(values) {
  const validValues = values
    .map((val) => parseFloat(val))
    .filter((val) => !isNaN(val) && val !== null && val !== undefined); // Keep only valid numbers

  if (validValues.length < 2) return "N/A";

  const firstValue = validValues[0];
  const lastValue = validValues[validValues.length - 1];

  if (firstValue === 0) {
    return "N/A";
  }

  const percentageChange = ((lastValue - firstValue) / firstValue) * 100;

  return percentageChange.toFixed(2) + "%";
}

function showPriceReviewChanges() {
  const startDate = document.getElementById("startDateChanges").value;
  const endDate = document.getElementById("endDateChanges").value;

  if (!startDate || !endDate) {
    alert("Please select both start and end dates.");
    return;
  }

  priceReviewChangesData = calculatePriceReviewChanges(
    new Date(startDate),
    new Date(endDate)
  );
  currentChangesPage = 1;

  renderChangesTable(currentSearchPriceReview, {
    sortType: priceReviewChangesSortType,
    sortOrder: priceReviewChangesSortOrder,
  });
}

function showModal(asin) {
  const modal = document.getElementById("myModal");
  const closeModal = document.getElementById("closeModal");
  const ctx = document.getElementById("myChart").getContext("2d");

  if (chartInstance) {
    chartInstance.destroy();
  }

  const itemData = parsedData.filter((item) => item.asin === asin);
  const prices = itemData.map((item) =>
    parseFloat(item.price.replace("$", ""))
  );
  const reviews = itemData.map((item) => parseInt(item.reviews));
  const labels = itemData.map((item) =>
    new Date(item.utcTime).toLocaleDateString()
  );

  chartInstance = new Chart(ctx, {
    type: "line",
    data: {
      labels: labels,
      datasets: [
        {
          label: "Price",
          data: prices,
          borderColor: "rgba(75, 192, 192, 1)",
          fill: false,
        },
        {
          label: "Reviews",
          data: reviews,
          borderColor: "rgba(153, 102, 255, 1)",
          fill: false,
        },
      ],
    },
    options: {
      scales: {
        y: {
          beginAtZero: true,
        },
      },
    },
  });

  modal.style.display = "block";
}

function closeModal() {
  const modal = document.getElementById("myModal");
  modal.style.display = "none";
}

document.getElementById("closeModal").onclick = closeModal;

document
  .getElementById("showChangesBtn")
  .addEventListener("click", showPriceReviewChanges);

renderParsedDataTable(
  searchDataForEntire,
  parsedDataStatusFilter,
  {
    sortType: parsedDataSortType,
    sortOrder: parsedDataSortOrder,
  },
  {
    startDate: startDateForParsedData,
    endDate: endDateForParsedData,
  }
);

const searchParsedData = document.getElementById("searchParsedData");
const searchPriceReview = document.getElementById("searchPriceReview");

function handleInputChange(event) {
  try {
    const value = event.target.value;
    const inputId = event.target.id;

    if (inputId === "searchParsedData") {
      console.log("Parsed Data Input changed:", value);
      currentParsedPage = 1;
      currentSearchParsedData = value;
      renderParsedDataTable(
        value,
        parsedDataStatusFilter,
        {
          sortType: parsedDataSortType,
          sortOrder: parsedDataSortOrder,
        },
        {
          startDate: startDateForParsedData,
          endDate: endDateForParsedData,
        }
      );
    } else if (inputId === "searchPriceReview") {
      console.log("Price Review Input changed:", value);
      currentChangesPage = 1;
      currentSearchPriceReview = value;

      renderChangesTable(value, {
        sortType: priceReviewChangesSortType,
        sortOrder: priceReviewChangesSortOrder,
      });
    }
  } catch (error) {
    console.error("Error in handling input change:", error);
  }
}

searchParsedData.addEventListener("input", handleInputChange);
searchPriceReview.addEventListener("input", handleInputChange);

document
  .getElementById("csvFileInput")
  .addEventListener("change", handleCSVUpload);

function handleCSVUpload(event) {
  const file = event.target.files[0];

  if (file) {
    const reader = new FileReader();

    reader.onload = (e) => {
      const text = e.target.result;
      parseCSV(text);
    };

    reader.readAsText(file);
  }
}

function parseCSV(data) {
  Papa.parse(data, {
    header: true,
    skipEmptyLines: true,
    complete: function (results) {
      parsedData = results.data.map((item) => {
        return {
          asin: item.asin || "",
          title: item.title || "",
          price: item.price || "",
          reviews: item.reviews || "",
          status: item.status || "",
          searchQuery: item.searchQuery || "",
          currencySymbol: item.currencySymbol || "",
          currency: item.currency || "",
          utcTime: item.utcTime || "",
          timeType: item.timeType || "",
          categories: item?.categories || "",
        };
      });

      renderParsedDataTable(
        searchDataForEntire,
        parsedDataStatusFilter,
        {
          sortType: parsedDataSortType,
          sortOrder: parsedDataSortOrder,
        },
        {
          startDate: startDateForParsedData,
          endDate: endDateForParsedData,
        }
      );

      priceReviewChangesData = [];
      currentChangesPage = 1;

      renderChangesTable(currentSearchPriceReview, {
        sortType: priceReviewChangesSortType,
        sortOrder: priceReviewChangesSortOrder,
      });
    },
  });
}

function toggleSortingArrowsForPriceReviewChanges(type) {
  const header =
    type === "price-change"
      ? document.querySelector("#changesTable #priceChangeHeader")
      : document.querySelector("#changesTable #reviewsChangeHeader");

  const sortOrder = header.getAttribute("data-sort");
  const isAsc = sortOrder ? sortOrder === "asc" : true;

  header.setAttribute("data-sort", isAsc ? "desc" : "asc");
  priceReviewChangesSortType = type;
  priceReviewChangesSortOrder = isAsc ? "desc" : "asc";

  renderChangesTable(currentSearchPriceReview, {
    sortType: priceReviewChangesSortType,
    sortOrder: priceReviewChangesSortOrder,
  });
}

document
  .querySelector("#changesTable #priceChangeHeader")
  .addEventListener("click", () =>
    toggleSortingArrowsForPriceReviewChanges("price-change")
  );
document
  .querySelector("#changesTable #reviewsChangeHeader")
  .addEventListener("click", () =>
    toggleSortingArrowsForPriceReviewChanges("reviews-change")
  );

document
  .querySelectorAll("#parsedDataStatusFilterContainer .status-filter")
  .forEach((checkbox) => {
    checkbox.addEventListener("change", (evt) => {
      const normalizedValue = checkbox.value.trim().toLowerCase();
      const filterKey =
        valueToFilterKeyMap[normalizedValue] ||
        normalizedValue.replace(/\s+/g, "_");
      if (filterKey) {
        parsedDataStatusFilter[filterKey] = checkbox.checked;
      }
      renderParsedDataTable(
        currentSearchParsedData,
        parsedDataStatusFilter,
        {
          sortType: parsedDataSortType,
          sortOrder: parsedDataSortOrder,
        },
        {
          startDate: startDateForParsedData,
          endDate: endDateForParsedData,
        }
      );
    });
  });

function toggleSortingArrowsForParsedData(type) {
  const header =
    type === "price"
      ? document.querySelector("#parsedDataTable #priceHeader")
      : document.querySelector("#parsedDataTable #reviewsHeader");

  const sortOrder = header.getAttribute("data-sort");
  const isAsc = sortOrder ? sortOrder === "asc" : true;

  header.setAttribute("data-sort", isAsc ? "desc" : "asc");
  parsedDataSortType = type;
  parsedDataSortOrder = isAsc ? "desc" : "asc";

  renderParsedDataTable(
    currentSearchParsedData,
    parsedDataStatusFilter,
    {
      sortType: parsedDataSortType,
      sortOrder: parsedDataSortOrder,
    },
    {
      startDate: startDateForParsedData,
      endDate: endDateForParsedData,
    }
  );
}

document
  .querySelector("#parsedDataTable #priceHeader")
  .addEventListener("click", () => toggleSortingArrowsForParsedData("price"));

document
  .querySelector("#parsedDataTable #reviewsHeader")
  .addEventListener("click", () => toggleSortingArrowsForParsedData("reviews"));

document
  .getElementById("filterParsedDataByDateBtn")
  .addEventListener("click", filterParsedDataByDate);

function filterParsedDataByDate() {
  const startDateInput = document.getElementById("startDateParsedData").value;
  const endDateInput = document.getElementById("endDateParsedData").value;

  if (!startDateInput || !endDateInput) {
    alert("Please select both a start date and an end date.");
    return;
  }

  const startDate = new Date(startDateInput);
  const endDate = new Date(endDateInput);

  if (endDate < startDate) {
    alert("End date must be after the start date.");
    return;
  }

  startDateForParsedData = startDate;
  endDateForParsedData = endDate;

  renderParsedDataTable(
    currentSearchParsedData,
    parsedDataStatusFilter,
    {
      sortType: parsedDataSortType,
      sortOrder: parsedDataSortOrder,
    },
    {
      startDate: startDateForParsedData,
      endDate: endDateForParsedData,
    }
  );
}

renderParsedDataTable(
  currentSearchParsedData,
  parsedDataStatusFilter,
  {
    sortType: parsedDataSortType,
    sortOrder: parsedDataSortOrder,
  },
  {
    startDate: startDateForParsedData,
    endDate: endDateForParsedData,
  }
);
