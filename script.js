"use strict";
const form = document.querySelector(".form");
const containerWorkouts = document.querySelector(".workouts");
const inputType = document.querySelector(".formInputType");
const inputDistance = document.querySelector(".formInputDistance");
const inputDuration = document.querySelector(".formInputDuration");
const inputCadence = document.querySelector(".formInputCadence");
const inputElevation = document.querySelector(".formInputElevation");
const clearButton = document.querySelector(".clear");

// ----------------------------------------------------------------------------------------------- //

// CREATING THE WORKOUT CLASS (PARENT CLASS FOR BOTH THE RUNNING AND CYCLING CHILDREN CLASSES)

class Workout {
  date = new Date();
  id = (Date.now() + "").slice(-10);

  constructor(coords, distance, duration) {
    this.coords = coords;
    this.distance = distance;
    this.duration = duration;
  }
  _setDescription() {
    // prettier-ignore
    const months = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

    this.description = `${this.type[0].toUpperCase()}${this.type.slice(1)} on ${
      months[this.date.getMonth()]
    } ${this.date.getDate()}`;
  }
}

class Running extends Workout {
  type = "running";
  constructor(coords, distance, duration, cadence) {
    super(coords, distance, duration);
    this.cadence = cadence;
    this.calcPace();
    this._setDescription();
  }

  calcPace() {
    this.pace = this.distance / this.duration;
    return this.pace;
  }
}
class Cycling extends Workout {
  type = "cycling";
  constructor(coords, distance, duration, elevationGain) {
    super(coords, distance, duration);
    this.elevationGain = elevationGain;
    this.calcSpeed();
    this._setDescription();
  }
  calcSpeed() {
    this.speed = this.distance / (this.duration / 60);
    return this.speed;
  }
}

// CREATING APP CLASS

class App {
  #map;
  #mapEvent;
  #workouts = [];
  #mapZoomLevel = 13;

  constructor() {
    // GETTING THE POSITION
    this._getPosition();

    // ACCESSING THE LOCAL STORAGE AND LOADING OLD WORKOUTS
    this._getLocalStorage();

    // EVENT HANDLERS
    form.addEventListener("submit", this._newWorkout.bind(this));
    inputType.addEventListener("change", this._toggleElevationField);
    containerWorkouts.addEventListener("click", this._moveToPopup.bind(this));
    clearButton.addEventListener("click", this.reset);
  }

  _getPosition() {
    if (navigator.geolocation)
      navigator.geolocation.getCurrentPosition(
        this._loadMap.bind(this),
        function () {
          alert("Could not get your current location");
        }
      );
  }

  _loadMap(position) {
    const latitude = position.coords.latitude;
    const longitude = position.coords.longitude;
    const coords = [latitude, longitude];

    this.#map = L.map("map").setView(coords, this.#mapZoomLevel);

    L.tileLayer("https://{s}.tile.openstreetmap.fr/hot/{z}/{x}/{y}.png", {
      attribution:
        '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    }).addTo(this.#map);

    this.#map.on("click", this._showForm.bind(this));

    this.#workouts.forEach((work) => {
      this._renderWorkoutMarker(work);
    });
  }

  _showForm(mapE) {
    this.#mapEvent = mapE;
    form.classList.remove("hidden");
    inputDistance.focus();
  }

  _hideForm() {
    inputDistance.value = inputDuration.value = inputCadence.value = inputElevation.value =
      "";
    form.style.display = "none";
    form.classList.add("hidden");
    setTimeout(() => (form.style.display = "grid"), 1000);
  }

  _toggleElevationField() {
    inputElevation.closest(".formRow").classList.toggle("formRowHidden");
    inputCadence.closest(".formRow").classList.toggle("formRowHidden");
  }

  _newWorkout(e) {
    const validInputs = (...inputs) =>
      inputs.every((inp) => Number.isFinite(inp));

    const allPositive = (...inputs) => inputs.every((inp) => inp > 0);
    e.preventDefault();
    clearButton.style.opacity = 1;

    // getting data from form
    const type = inputType.value;
    const distance = +inputDistance.value;
    const duration = +inputDuration.value;
    const { lat, lng } = this.#mapEvent.latlng;
    let workout;

    // if workout is running, create running object
    if (type === "running") {
      const cadence = +inputCadence.value;

      // check input is valid
      if (
        !validInputs(distance, duration, cadence) ||
        !allPositive(distance, duration, cadence)
      )
        return alert("Inputs must be positive numbers!");
      workout = new Running([lat, lng], distance, duration, cadence);
    }
    // if workout is cycling, create cycling object
    if (type === "cycling") {
      const elevation = +inputElevation.value;

      // check input is valid
      if (
        !validInputs(distance, duration, elevation) ||
        !allPositive(distance, duration)
      )
        return alert("Inputs must be positive numbers!");
      workout = new Cycling([lat, lng], distance, duration, elevation);
    }

    // add new object to workout array

    this.#workouts.push(workout);

    // render workout on the map as a marker

    this._renderWorkoutMarker(workout);

    // render workout on a list

    this._renderWorkoutList(workout);

    // hide form
    this._hideForm();

    // store workouts in local storage
    this._setLocalStorage();
  }

  _renderWorkoutMarker(workout) {
    L.marker(workout.coords)
      .addTo(this.#map)
      .bindPopup(
        L.popup({
          maxWidth: 250,
          minWidth: 100,
          autoClose: false,
          closeOnClick: false,
          className: `${workout.type}-popup`,
        })
      )
      .setPopupContent(
        `${workout.type === "running" ? "🏃‍" : "🚴"} ${workout.description}`
      )
      .openPopup();
  }
  _renderWorkoutList(workout) {
    let html = `
    <li class="workout workout-${workout.type}" data-id="${workout.id}">
    <h2 class="workoutTitle">${workout.description}</h2>
    <div class="workoutDetails">
      <span class="workoutIcon">${
        workout.type === "running" ? "🏃‍" : "🚴"
      }</span>
      <span class="workoutValue">${workout.distance}</span>
      <span class="workoutUnit">km</span>
    </div>
    <div class="workoutDetails">
      <span class="workoutIcon">⏱‍</span>
      <span class="workoutValue">${workout.duration}</span>
      <span class="workoutUnit">min</span>
    </div>`;
    if (workout.type === "running") {
      html += `    
      <div class="workoutDetails">
      <span class="workoutIcon">⚡️</span>
      <span class="workoutValue">${workout.pace.toFixed(1)}</span>
      <span class="workoutUnit">min/km</span>
    </div>
    <div class="workoutDetails">
      <span class="workoutIcon">👟</span>
      <span class="workoutValue">${workout.cadence}</span>
      <span class="workoutUnit">spm</span>
    </div>
    </li>`;
    }
    if (workout.type === "cycling") {
      html += `
      <div class="workoutDetails">
      <span class="workoutIcon">⚡️</span>
      <span class="workoutValue">${workout.speed.toFixed(1)}</span>
      <span class="workoutUnit">km/hr</span>
    </div>
    <div class="workoutDetails">
      <span class="workoutIcon">🚵‍</span>
      <span class="workoutValue">${workout.elevationGain}</span>
      <span class="workoutUnit">m</span>
    </div>
  </li>
      `;
    }
    form.insertAdjacentHTML("afterend", html);
  }
  _moveToPopup(e) {
    const workoutEl = e.target.closest(".workout");
    if (!workoutEl) return;
    const workout = this.#workouts.find(
      (work) => work.id === workoutEl.dataset.id
    );
    this.#map.setView(workout.coords, this.#mapZoomLevel, {
      animate: true,
      pan: {
        duration: 1,
      },
    });
  }
  _setLocalStorage() {
    localStorage.setItem("workouts", JSON.stringify(this.#workouts));
  }

  _getLocalStorage() {
    const data = JSON.parse(localStorage.getItem("workouts"));
    if (!data) return;
    this.#workouts = data;
    this.#workouts.forEach((work) => {
      this._renderWorkoutList(work);
    });
    clearButton.style.opacity = 1;
  }
  reset() {
    const sure = confirm(
      "Are you sure you want to clear all your workouts history?"
    );
    if (sure) {
      localStorage.removeItem("workouts");
      location.reload();
    }
  }
}

const app = new App();
