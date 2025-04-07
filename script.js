
// Kreiraj IntersectionObserver
document.addEventListener("DOMContentLoaded", function () {
    // Selektuj oba div-a sa njihovim klasama
    const targetDivs = document.querySelectorAll('.desnastranaslika, .lijevastranaslika');

    if (targetDivs.length === 0) {
        console.warn("⚠️ Nema elemenata za animaciju. Provjeri klase u HTML-u.");
        return;
    }

    // Kreiraj IntersectionObserver
    const observer = new IntersectionObserver((entries, observer) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('visible'); // Dodaj klasu za animaciju
                observer.unobserve(entry.target);      // Prestani pratiti
            }
        });
    }, {
        threshold: 0.3, // malo niži prag da bolje radi na telefonu
        rootMargin: '0px 0px -10% 0px' // ranije aktivira
    });

    // Prati svaki div
    targetDivs.forEach(div => observer.observe(div));

    // Checkbox za datum/istek
    const hasExpiryCheckbox = document.getElementById('has_expiry');
    if (hasExpiryCheckbox) {
        hasExpiryCheckbox.addEventListener('change', function () {
            const expirySection = document.getElementById('expiry_section');
            const expiresDate = document.getElementById('expires_date');
            const expiresTime = document.getElementById('expires_time');

            const show = this.checked;
            expirySection.style.display = show ? 'block' : 'none';
            expiresDate.required = show;
            expiresTime.required = show;
        });
    }
});


// Funkcija koja puni tabelu
function populateTable(rows) {
    const table = document.getElementById('raspored-tabela');
    table.innerHTML = '';

    // Dodajemo red za naslov "Raspored Treninga"
    const titleRow = table.insertRow();
    const titleCell = titleRow.insertCell();
    titleCell.colSpan = 6; // Spajamo sve kolone
    titleCell.innerHTML = '<h1>RASPORED TRENINGA</h1>';
    titleCell.style.textAlign = 'center';

    const headerRow = table.insertRow();
    const days = ['PONEDJELJAK', 'UTORAK', 'SRIJEDA', 'CETVRTAK', 'PETAK', 'SUBOTA'];
    days.forEach(day => {
        let cell = headerRow.insertCell();
        cell.innerHTML = `<h2>${day}</h2>`;
    });

    rows.forEach(row => {
        const tableRow = table.insertRow();

        [
            ['ponedjeljak', 'ponedjeljak_time'],
            ['utorak', 'utorak_time'],
            ['srijeda', 'srijeda_time'],
            ['cetvrtak', 'cetvrtak_time'],
            ['petak', 'petak_time'],
            ['subota', 'subota_time']
        ].forEach(([day, time]) => {
            let nameCell = tableRow.insertCell();
            
            const name = row[day] || '';
            const timeValue = row[time] || '';

            // Prikazivanje naziva i vremena jedno ispod drugog
            nameCell.innerHTML = `<h3>${name}</h3>${timeValue ? `<p>${timeValue}</p>` : ''}`;
        });
    });
}

// Otvoriti modal
document.addEventListener("DOMContentLoaded", () => {
  function fetchTableData() {
    fetch("http://localhost:3000/getRaspored")
      .then(response => response.json())
      .then(data => {
        if (data && data.rows) {
          populateTable(data.rows);  // Popuniti tabelu sa podacima
        } else {
          console.log('Nema podataka');
        }
      })
      .catch(error => {
        console.error('Greška pri dohvaćanju podataka:', error);
      });
  }

  // Pozivanje funkcije za učitavanje podataka
  fetchTableData();
});

// Otvoriti modal za editovanje
function openModaltabela() {
    document.getElementById('modaltabela').style.display = "flex";
    populateEditForm(); // Popuniti formu sa trenutnim podacima
}

// Zatvoriti modal
function closeModaltebela() {
    document.getElementById('modaltabela').style.display = "none";
}

// Popunjavanje forme sa podacima iz tabele
function populateEditForm() {
    const tableRows = document.querySelectorAll("#raspored-tabela tr");
    const formTable = document.querySelector(".edit-tabela");
    formTable.innerHTML = "";

    // Kreiramo niz za praćenje već dodanih redova
    const addedRows = [];

    tableRows.forEach((row, index) => {
        // Preskačemo prvi red (naslov) i drugi red (dani u sedmici)
        if (index > 1) {
            const cells = row.querySelectorAll("td");
            const newRow = formTable.insertRow();

            let rowContent = ""; // Sadržaj reda za proveru duplikata
            let isDuplicate = false; // Flag za proveru duplikata

            cells.forEach((cell, cellIndex) => {
                const nameElement = cell.querySelector("h3");
                const timeElement = cell.querySelector("p");

                const nameText = nameElement ? nameElement.innerText.trim() : "";
                const timeText = timeElement ? timeElement.innerText.trim() : "";

                // Kreiramo jedan input koji sadrži naziv i vreme u istom redu
                const nameTimeInputWrapper = document.createElement("div");
                
                const nameInput = document.createElement("input");
                nameInput.type = "text";
                nameInput.value = nameText;
                nameInput.name = [
                    'ponedjeljak', 'utorak', 'srijeda',
                    'cetvrtak', 'petak', 'subota'
                ][cellIndex];

                const timeInput = document.createElement("input");
                timeInput.type = "text";
                timeInput.value = timeText;
                timeInput.name = [
                    'ponedjeljak_time', 'utorak_time', 'srijeda_time',
                    'cetvrtak_time', 'petak_time', 'subota_time'
                ][cellIndex];

                // Stavljamo oba inputa unutar jednog div elementa
                nameTimeInputWrapper.appendChild(nameInput);
                nameTimeInputWrapper.appendChild(timeInput);

                const newCell = newRow.insertCell();
                newCell.appendChild(nameTimeInputWrapper);

                // Sadržaj reda (prva ćelija) za proveru duplikata
                rowContent += nameText + " " + timeText + " ";
            });

            // Proveravamo da li je red duplikat
            if (addedRows.includes(rowContent.trim())) {
                isDuplicate = true;
            }

            // Ako nije duplikat, dodajemo red
            if (!isDuplicate) {
                addedRows.push(rowContent.trim()); // Dodajemo sadržaj reda u niz
            } else {
                formTable.deleteRow(formTable.rows.length - 1); // Uklanjamo poslednji red (ako je duplikat)
            }
        }
    });
}
function saveTableData(event) {
  event.preventDefault();
  const formRows = document.querySelectorAll(".edit-tabela tr");
  const updatedData = [];

  formRows.forEach(row => {
    const nameInputs = row.querySelectorAll("input");
    const rowData = {
      ponedjeljak: nameInputs[0].value,
      ponedjeljak_time: nameInputs[1].value,
      utorak: nameInputs[2].value,
      utorak_time: nameInputs[3].value,
      srijeda: nameInputs[4].value,
      srijeda_time: nameInputs[5].value,
      cetvrtak: nameInputs[6].value,
      cetvrtak_time: nameInputs[7].value,
      petak: nameInputs[8].value,
      petak_time: nameInputs[9].value,
      subota: nameInputs[10].value,
      subota_time: nameInputs[11].value
    };
    updatedData.push(rowData);
  });

  // Slanje ažuriranih podataka na server
  fetch("http://localhost:3000/updateRaspored", {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify({ rows: updatedData })
  })
  .then(response => response.json())
  .then(data => {
    if (data.success) {
      updateTableFromServer();  // Ažuriraj tabelu sa novim podacima
      closeModaltebela();       // Zatvori modal
    } else {
      alert("Došlo je do greške pri čuvanju podataka.");
    }
  })
  .catch(error => console.error("Greška pri slanju podataka:", error));
}

document.getElementById("edit-form").onsubmit = saveTableData;

// Ažuriranje tabele sa servera (nakon što se sačuvaju izmene)
function updateTableFromServer() {
  fetch("http://localhost:3000/getRaspored")
    .then(response => response.json())
    .then(data => {
      if (data && data.rows) {
        populateTable(data.rows);  // Popuniti tabelu sa novim podacima
      } else {
        console.log('Nema podataka');
      }
    })
    .catch(error => {
      console.error('Greška pri dohvaćanju podataka:', error);
    });
}

let trenutniTrenerSlidetelefon = 0;
const treneriSlidertelefon = document.getElementById("treneri-slidertelefon");
const trenerSlidestelefon = document.querySelectorAll(".treneri-slidetelefon");
const ukupnoTrenerSlidestelefon = trenerSlidestelefon.length;
const trenerDotstelefon = document.querySelectorAll(".trener-dottelefon");

// Funkcija za promenu trenera
function promijeniTrenerSlidetelefon(index) {
    trenutniTrenerSlidetelefon = index;
    azurirajTrenerSlidertelefon();
}

// Funkcija za ažuriranje trenera slidera
function azurirajTrenerSlidertelefon() {
    treneriSlidertelefon.style.transform = `translateX(-${trenutniTrenerSlidetelefon * 100}%)`;
    trenerDotstelefon.forEach((dot, i) => {
        dot.classList.toggle("aktivan", i === trenutniTrenerSlidetelefon);
    });
}

// Automatsko pomeranje trenera samo ako je ekran manji od 768px
function autoTrenerSlidetelefon() {
    if (window.innerWidth <= 768) {  
        trenutniTrenerSlidetelefon = (trenutniTrenerSlidetelefon + 1) % ukupnoTrenerSlidestelefon;
        azurirajTrenerSlidertelefon();
    }
}

// Automatski prebacuje trenera svakih 5 sekundi
function automatskiPomerajtelefon() {
    setInterval(autoTrenerSlidetelefon, 5000); 
}

// Pokreći automatsko prebacivanje trenera kada je stranica učitana
window.addEventListener('load', automatskiPomerajtelefon);

// Dodaj funkciju za klikanje na tačke
trenerDotstelefon.forEach((dot, index) => {
    dot.addEventListener("click", () => {
        promijeniTrenerSlidetelefon(index);
    });
});









// Funkcija za otvaranje login prozora
        function openLoginWindow() {
            let loginWindow = window.open("login.html", "LoginWindow", "width=400,height=300");
        }
    
        // Provera statusa prijave
        function checkLoginStatus() {
            let korisnik = localStorage.getItem("korisnik");
            if (korisnik) {
                document.getElementById("loginText").innerHTML = "Dobrodošao, " + korisnik + "!";
                document.getElementById("otvori-modal").style.display = "block";
                document.getElementById("logout").style.display = "block";
                document.getElementById("edit-btn").style.display = "block";

            }
        }
    
        // Logout funkcija
        function logout() {
            localStorage.removeItem("korisnik");
            localStorage.removeItem("token"); // Ukloni token sa localStorage
            location.reload(); // Osvježi stranicu
        }
        window.onload = function() {
            // Postavi oba modala na 'display: none' prilikom učitavanja stranice
            document.getElementById("modal").style.display = "none";
            document.getElementById("modal-edit").style.display = "none";
        };
        // Provjera statusa prijave svakih 1 sekundu
        setInterval(checkLoginStatus, 1000);
    
        // Funkcija za login (ovo se poziva kada korisnik unese podatke za login)
        function login() {
            let username = document.getElementById("username").value;
            let password = document.getElementById("password").value;
    
            if (!username || !password) {
                alert("Unesite korisničko ime i lozinku!");
                return;
            }
    
            // Poslati podatke na backend za login
            fetch("http://localhost:3000/login", {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    username: username,
                    password: password
                })
            })
            .then(response => response.json())
            .then(data => {
                if (data.status === "success") {
                    // Ako je login uspešan, sačuvaj token i korisnika u localStorage
                    localStorage.setItem("korisnik", username);
                    localStorage.setItem("token", data.token);  // Spremi JWT token u localStorage
                    window.close();  // Zatvori login prozor
                    location.reload(); // Osvježi stranicu
                } else {
                    alert("Pogrešno korisničko ime ili lozinka!");
                }
            })
        }
    
        let trenutniTrenerSlide = 0;
const treneriSlider = document.getElementById("treneri-slider");
const trenerSlides = document.querySelectorAll(".treneri-slide");
const trenerDots = document.querySelectorAll(".trener-dot");
const ukupnoTrenerSlides = trenerSlides.length;
let trenerTimer = null;

// Funkcija za ažuriranje trenera slidera
function azurirajTrenerSlider() {
    treneriSlider.style.transform = `translateX(-${trenutniTrenerSlide * 100}%)`;
    
    // Promeni aktivnu tačku
    trenerDots.forEach((dot, i) => {
        dot.classList.toggle("aktivan", i === trenutniTrenerSlide);
    });
}

// Funkcija za promenu trenera
function promijeniTrenerSlide(index) {
    trenutniTrenerSlide = index;
    azurirajTrenerSlider();
    restartujAutomatskiPomeraj(); // Restartujemo automatsko pomeranje kada korisnik klikne na tačku
}

// Automatsko pomeranje trenera
function autoTrenerSlide() {
    trenutniTrenerSlide = (trenutniTrenerSlide + 1) % ukupnoTrenerSlides;
    azurirajTrenerSlider();
}

// Pokreće automatsko prebacivanje trenera svakih 5 sekundi
function pokreniAutomatskiPomeraj() {
    trenerTimer = setInterval(autoTrenerSlide, 5000);
}

// Restartuje automatsko prebacivanje kada korisnik klikne na tačku
function restartujAutomatskiPomeraj() {
    clearInterval(trenerTimer);
    pokreniAutomatskiPomeraj();
}

// Pokreće automatsko prebacivanje trenera kada je stranica učitana
window.addEventListener('load', function() {
    pokreniAutomatskiPomeraj();
});

// Dodaj funkciju za klikanje na tačke
trenerDots.forEach((dot, index) => {
    dot.addEventListener("click", () => {
        promijeniTrenerSlide(index); // Ova funkcija je sada ispravno povezana sa klikom na tačku
    });
});

    
        document.addEventListener("DOMContentLoaded", function() {
            dohvatiNovosti();
        });
    
        function prikaziPanel() {
            document.getElementById("novosti-panel").style.display = "block";
        }
    
        function sakrijPanel() {
            document.getElementById("novosti-panel").style.display = "none";
        }
    
        // Funkcija za dodavanje novosti
// Funkcija za otvaranje forme za unos novosti
document.addEventListener("DOMContentLoaded", function() {
    
    document.getElementById("modal-form").addEventListener("submit", function(event) {
        event.preventDefault();

        // Dohvati vrednosti iz input polja
        const naslov = document.getElementById("naslov").value;
        const opis = document.getElementById("opis").value;
        const short = document.getElementById("short").value;
        const slika = document.getElementById("slika").files[0];
        const expires_date = document.getElementById("expires_date").value;
        const expires_time = document.getElementById("expires_time").value;
        const isPinned = document.getElementById("is_pinned").checked; // <-- Dodano

        // Provera da li su svi podaci ispunjeni
        if (!naslov || !opis || !short || !slika ) {
            alert("Svi podaci moraju biti popunjeni!");
            return;
        }

        // Kombinovanje datuma i vremena u ISO format
        const expires_at = `${expires_date}T${expires_time}:00.000Z`;

        // Priprema podataka za slanje
        const formData = new FormData();
        formData.append("title", naslov);
        formData.append("content", opis);
        formData.append("short", short);
        formData.append("slika", slika);
        formData.append("expires_at", expires_at);
        formData.append("is_pinned", isPinned); // <-- Dodano

        // Slanje podataka na server
        fetch("http://localhost:3000/add-news", {
            method: "POST",
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.status === "success") {
                alert("Novost je uspešno dodana!");
                dohvatiNovosti();
                document.getElementById("modal").style.display = "none";
            } else {
                alert(`Došlo je do greške: ${data.message}`);
            }
        })
        .catch(error => {
            console.error("Greška pri slanju podataka:", error);
        });
    });

});

    function zatvoriFormu() {
        document.getElementById('novost-form').reset();
        console.log("Forma je zatvorena");
    }


    function dohvatiNovosti() {
    let screenWidth = window.innerWidth;
    let limit = screenWidth < 768 ? 3 : 6;
    let korisnik = localStorage.getItem("korisnik"); // provjera da li je korisnik ulogovan
    fetch(`http://localhost:3000/get-news?page=${trenutnaStranica}&limit=${limit}`)
        .then(response => response.json())
        .then(data => {
            let novostiLista = document.getElementById("novosti-lista");
            novostiLista.innerHTML = "";
            novostiLista.classList.add("news-container");

            if (data.novosti && data.novosti.length > 0) {
                data.novosti.sort((a, b) => {
                    return (b.is_pinned === true) - (a.is_pinned === true);
                });
                data.novosti.forEach(novost => {
                    let novostDiv = document.createElement("div");
                    novostDiv.classList.add("news-item");
                    novostDiv.setAttribute("data-id", novost.id);
                    novostDiv.setAttribute("data-content", encodeURIComponent(novost.content)); // 🚀 Čuvamo content ispravno!
                    novostDiv.setAttribute("data-expires-at", novost.expires_at); // Dodaj datum isteka
                    novostDiv.setAttribute("data-ispinned", novost.ispinned ? "1" : "0");

                    let naslovEl = document.createElement("h2");
                    naslovEl.classList.add("naslov");
                    naslovEl.innerText = novost.title;

                    let slikaEl = document.createElement("img");
                    slikaEl.src = `http://localhost:3000/${novost.image_path}`;
                    if (screenWidth < 768) {
                        slikaEl.style.width = "100%";
                        slikaEl.style.height = "auto";
                    } else {
                        slikaEl.style.width = "300px";
                        slikaEl.style.height = "auto";
                        slikaEl.style.border = "2px solid yellow";
                        slikaEl.style.borderRadius = "15px";
                    }

                    let kraciOpisEl = document.createElement("p");
                    kraciOpisEl.classList.add("short");
                    kraciOpisEl.innerText = novost.short;

                    let datumObjavljen = new Date(novost.created_at);
                    let dan = datumObjavljen.getDate().toString().padStart(2, '0');
                    let mesec = (datumObjavljen.getMonth() + 1).toString().padStart(2, '0');
                    let godina = datumObjavljen.getFullYear();
                    let sati = datumObjavljen.getHours().toString().padStart(2, '0');
                    let minuti = datumObjavljen.getMinutes().toString().padStart(2, '0');

                    if (novost.ispinned) {
                        let pinnedLabel = document.createElement("div");
                        pinnedLabel.classList.add("pinned-label");
                        pinnedLabel.innerText = "📌";  // Dodajemo tekst "Pinned"
                        novostDiv.appendChild(pinnedLabel);
                    }

                    // Dodaj dugmadi za editovanje i brisanje
                    let dugmeEdit = document.createElement("button");
                    dugmeEdit.innerText = "Edituj";
                    dugmeEdit.onclick = function() {
                        editujNovostModaledit(novost.id); // Poziva funkciju za editovanje
                    };

                    let dugmeObrisi = document.createElement("button");
                    dugmeObrisi.innerText = "Obriši";
                    dugmeObrisi.onclick = function() {
                        obrisiNovost(novost.id); // Poziva funkciju za brisanje
                    };

                    // Ako je objava pinana, dodaj "Pinned" oznaku



                    let dugmeSaznaj = document.createElement("button");
                    dugmeSaznaj.innerText = "Saznaj više";
                    dugmeSaznaj.onclick = function () {
                        prikaziPrikazNovosti(novost); // Prikazivanje detalja novosti
                    };

                    // Dodavanje dugmadi u div
                    if (korisnik) {
    novostDiv.appendChild(dugmeEdit);
    novostDiv.appendChild(dugmeObrisi);
}
                    novostDiv.appendChild(naslovEl);
                    novostDiv.appendChild(slikaEl);
                    novostDiv.appendChild(kraciOpisEl);
                    novostDiv.appendChild(dugmeSaznaj);

                    novostiLista.appendChild(novostDiv);
                    let datumEl = document.createElement("p");
                    datumEl.classList.add("datum");
                    datumEl.innerText = `Objavljeno: ${dan}.${mesec}.${godina} u ${sati}:${minuti}`;
                    novostDiv.appendChild(datumEl);
                                        // Ako novost ima datum isteka, prikaži countdown timer
                                        if (novost.expires_at && !novost.isExpired) {
                        let countdownEl = document.createElement("p");
                        countdownEl.classList.add("expires-in");
                        let expiresIn = novost.expires_in; // Preostalo vreme

                        function updateTimer() {
                            if (expiresIn > 0) {
                                expiresIn -= 1000;
                                let seconds = Math.floor((expiresIn % (1000 * 60)) / 1000);
                                let minutes = Math.floor((expiresIn % (1000 * 60 * 60)) / (1000 * 60));
                                let hours = Math.floor((expiresIn % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
                                let days = Math.floor(expiresIn / (1000 * 60 * 60 * 24));

                                countdownEl.innerText = `Ističe za ${days}d ${hours}h ${minutes}m ${seconds}s`;
                            } else {
                                countdownEl.innerText = "Ističe za 0d 0h 0m 0s";
                                // Ako je novost istekla, izbriši je sa stranice
                                obrisiNovostbezprovjere(novost.id); // Poziva funkciju za brisanje novosti
                                novostDiv.remove(); // Uklanja div sa novosti iz DOM-a
                            }
                        }

                        updateTimer();
                        setInterval(updateTimer, 1000);
                        novostDiv.appendChild(countdownEl);
                    } else if (novost.isExpired) {
                        // Kada je novost istekla, brišemo je odmah
                        obrisiNovostbezprovjere(novost.id); // Poziva funkciju za brisanje novosti
                        novostDiv.remove(); // Uklanja novost sa stranice
                    }

                });
            } else {
                novostiLista.innerHTML = "Nema novosti za prikaz.";
            }

            // Ažuriraj broj stranica
            ukupnoStranica = data.totalPages;
            document.getElementById('total-pages').textContent = ukupnoStranica;
            document.getElementById('page-number').textContent = trenutnaStranica;

            // Omogući/Onemogući dugmadi za paginaciju
            document.getElementById('prev').disabled = trenutnaStranica === 1;
            document.getElementById('next').disabled = trenutnaStranica === ukupnoStranica;
            
        });
}

// Funkcija za prikazivanje celokupnog opisa u modalu
function prikaziCelokupanOpis(celokupanOpis) {
    let modal = document.getElementById("modal-full-description");
    let fullDescriptionText = document.getElementById("full-description-text");
    fullDescriptionText.innerText = celokupanOpis;
    modal.style.display = "block"; // Otvori modal
}


// Funkcija za zatvaranje modala
function editujNovostModaledit(id) {
    console.log(`Editovanje novosti sa ID: ${id}`);

    let novostDiv = document.querySelector(`[data-id='${id}']`);
    if (!novostDiv) {
        console.error("Novost sa ID: " + id + " nije pronađena!");
        return;
    }

    // Dohvatanje podataka iz div-a
    let naslovEl = novostDiv.querySelector(".naslov");
    let shortEl = novostDiv.querySelector(".short");
    let content = decodeURIComponent(novostDiv.getAttribute("data-content"));
    let expiresAt = novostDiv.getAttribute("data-expires-at");
    let isPinned = novostDiv.getAttribute("data-ispinned") === "1";  // Provjeri ako je pinana

    // Popunjavanje input polja sa podacima
    document.getElementById("naslovzaedit").value = naslovEl ? naslovEl.innerText : '';
    document.getElementById("opiszaedit").value = content || '';  // Dodaj fallback ako je content null
    document.getElementById("shortzaedit").value = shortEl ? shortEl.innerText : '';

    // Postavljanje datuma isteka i vremena, ali samo ako je prisutan
    if (expiresAt && expiresAt !== 'null' && expiresAt !== '') {
        const expiresDate = new Date(expiresAt);
        if (!isNaN(expiresDate.getTime())) {
            document.getElementById("expires_date_edit").value = expiresDate.toISOString().split('T')[0];
            document.getElementById("expires_time_edit").value = expiresDate.toTimeString().split(' ')[0];
            document.getElementById('has_expiry_edit').checked = true;  // Označi checkbox ako postoji datum isteka
            document.getElementById("expiry_section_edit").style.display = 'block';  // Prikazivanje sekcije
        } else {
            document.getElementById("expires_date_edit").value = '';
            document.getElementById("expires_time_edit").value = '';
            document.getElementById('has_expiry_edit').checked = false;
            document.getElementById("expiry_section_edit").style.display = 'none';  // Sakrij sekciju
        }
    } else {
        document.getElementById("expires_date_edit").value = '';
        document.getElementById("expires_time_edit").value = '';
        document.getElementById('has_expiry_edit').checked = false;
        document.getElementById("expiry_section_edit").style.display = 'none';  // Sakrij sekciju
    }

    // Postavljanje vrijednosti za Pinanje
    document.getElementById("edit_is_pinned").checked = isPinned;  // Ako je pinana, checkbox će biti označen
console.log(isPinned)
    // Otvaranje modala
    document.getElementById("modal-edit-form").setAttribute("data-id", id);
    document.getElementById("modal-edit").style.display = "flex";  // Prikazuje modal
}

// Dodajemo event listener za checkbox
document.getElementById('has_expiry_edit').addEventListener('change', toggleExpirySection);

// Funkcija koja prikazuje ili sakriva sekciju za datum i vrijeme
function toggleExpirySection() {
    const expirySection = document.getElementById('expiry_section_edit');
    const dateInput = document.getElementById('expires_date_edit');
    const timeInput = document.getElementById('expires_time_edit');
    const checkbox = document.getElementById('has_expiry_edit');

    if (checkbox.checked) {
        expirySection.style.display = 'block';
        dateInput.required = true;
        timeInput.required = true;
    } else {
        expirySection.style.display = 'none';
        dateInput.required = false;
        timeInput.required = false;

        // Očisti vrijednosti ako korisnik poništi checkbox
        dateInput.value = '';
        timeInput.value = '';
    }
}
function sacuvajIzmenemodaledit() {
    let naslov = document.getElementById("naslovzaedit").value;
    let short = document.getElementById("shortzaedit").value;
    let opis = document.getElementById("opiszaedit").value;
    let slika = document.getElementById("slikazaedit").files[0];
    let expiresDate = document.getElementById("expires_date_edit").value;
    let expiresTime = document.getElementById("expires_time_edit").value;
    let hasExpiry = document.getElementById("has_expiry_edit").checked;

    let expiresAt = null;

    // Dodajemo pinanje
    let isPinned = document.getElementById("edit_is_pinned").checked ? 1 : 0;

    // Ako je checkbox označen i ako je datum i vreme uneto
    if (hasExpiry && expiresDate && expiresTime) {
        expiresAt = new Date(`${expiresDate}T${expiresTime}:00`);
        console.log("Kreirani datum za expires_at:", expiresAt);
    } else if (hasExpiry && (expiresDate || expiresTime)) {
        expiresAt = new Date(`${expiresDate || '1970-01-01'}T${expiresTime || '00:00'}:00`);
        console.log("Kreirani datum za expires_at (nekompletan unos):", expiresAt);
    }

    if (!naslov || !short || !opis) {
        alert("Svi podaci moraju biti popunjeni!");
        return;
    }

    // Inicijalizacija formData
    let formData = new FormData();
    formData.append("id", document.getElementById("modal-edit-form").getAttribute("data-id"));
    formData.append("naslov", naslov);
    formData.append("short", short);
    formData.append("opis", opis);
    formData.append("slika", slika);
    formData.append("is_pinned", isPinned); // Dodajemo informaciju o pinanju
    formData.append("expires_at", expiresAt); // Dodajemo expires_at

    // Logovanje podataka koje šaljemo na server
    console.log("Podaci koji se šalju na server:");
    console.log("ID:", document.getElementById("modal-edit-form").getAttribute("data-id"));
    console.log("Naslov:", naslov);
    console.log("Kratki opis:", short);
    console.log("Opis:", opis);
    console.log("Slika:", slika ? slika.name : "Nema slike");
    console.log("Expires At:", expiresAt);
    console.log("Is Pinned:", isPinned);

    // Slanje podataka na server
    fetch("http://localhost:3000/edit-news", {
        method: "POST",
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        console.log("Odgovor sa servera:", data);
        if (data.status === "success") {
            alert("Novost je uspešno sačuvana.");
            zatvoriModalmodaledit(); // Zatvaranje modala
        } else {
            alert("Došlo je do greške pri čuvanju novosti.");
        }
    })
    .catch(error => {
        console.error("Greška pri slanju podataka:", error);
    });
}


function zatvoriModalmodaledit() {
    document.getElementById("modal-edit").style.display = "none";
    // Resetujemo vrednosti forme

    // Ponovno učitaj stranicu kako bi resetovao stanje
    location.reload();  // Ovo će ponovo učitati stranicu, kao da si je ponovno otvorio
}


document.getElementById("modal-edit-form").addEventListener("submit", function(event) {
    let fileInput = document.getElementById("novaslika");  // Input za novu sliku
    let hiddenSlikaInput = document.getElementById("stara-slika");  // Skriveni input sa starom slikom

    if (!fileInput.files.length) {
        // Ako korisnik nije izabrao novu sliku, postavi vrijednost na staru
        fileInput.value = hiddenSlikaInput.value;
    }
});



        // Funkcija za brisanje novosti
        function obrisiNovost(id) {
    // Potvrda korisnika pre nego što izbrišemo novost
    if (confirm("Da li ste sigurni da želite da obrišete ovu novost?")) {
        fetch(`http://localhost:3000/delete-news/${id}`, {
            method: "DELETE",
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}` // Koristimo token za autentifikaciju
            }
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Greška pri brisanju novosti');
            }
            return response.json();
        })
        .then(data => {
            // Proveravamo odgovor servera
            if (data.status === "success") {
                alert("Novost je uspešno obrisana.");
                dohvatiNovosti(); // Osveži listu novosti
            } else {
                alert("Greška prilikom brisanja novosti.");
            }
        })
        .catch(error => {
            // U slučaju greške, obavestiti korisnika
            console.error("Greška:", error);
            alert("Došlo je do greške pri brisanju novosti.");
        });
    }
}

function obrisiNovostbezprovjere(id) {
    // Potvrda korisnika pre nego što izbrišemo novost
        fetch(`http://localhost:3000/delete-news/${id}`, {
            method: "DELETE",
            headers: {
                'Authorization': `Bearer ${localStorage.getItem('token')}` // Koristimo token za autentifikaciju
            }
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Greška pri brisanju novosti');
            }
            return response.json();
        })
        .then(data => {
            // Proveravamo odgovor servera
            if (data.status === "success") {
                dohvatiNovosti(); // Osveži listu novosti
            }
        })

}

        // Funkcija za otvaranje forme za unos novosti
        function otvoriFormu() {
            document.getElementById("nova-novost-forma").style.display = "block";
        }

        // Funkcija za zatvaranje forme
        function zatvoriFormu() {
            document.getElementById("nova-novost-forma").style.display = "none";
        }

        // Funkcija za unos novosti
       
    // Funkcija koja dohvaća broj objava
    function getNewsCount() {
      fetch('/get-news-count')
        .then(response => response.json())
        .then(data => {
          const totalNews = data.total; // Broj objava
          if (totalNews > 0) {
            document.getElementById('novosti-count').textContent = `Ukupno objava: ${totalNews}`;
          }
        })
    }

    function loadNews() {
        function loadNews() {
        fetch('http://localhost:3000/get-news')
  .then(response => response.json())
  .then(data => {
    console.log("Prijem podataka:", data);  // Proveri šta dobijaš iz servera

    const newsContainer = document.getElementById('novosti-wrapper');
    if (!newsContainer) {
      console.error('Element sa ID-om "novosti-wrapper" nije pronađen.');
      return;
    }

    // Pristupanje novostima kroz ključ 'novosti'
    const newsData = data.novosti || [];  // Ako nije niz, koristi prazan niz

    if (newsData.length === 0) {
      newsContainer.innerHTML = '<p>Nema novosti za prikazivanje.</p>';
    } else {
      newsContainer.innerHTML = '';
      newsData.forEach(news => {
        const newsItem = document.createElement('div');
        newsItem.classList.add('news-item');

        const title = document.createElement('h3');
        title.textContent = news.title;
        newsItem.appendChild(title);

        const content = document.createElement('p');
        content.textContent = news.content;
        newsItem.appendChild(content);

        if (news.image_path) {
          const image = document.createElement('img');
          image.src = 'http://localhost:3000/' + news.image_path;  // Pravilan URL za slike
          image.alt = news.title;
          newsItem.appendChild(image);
        }

        const createdAt = document.createElement('p');
        createdAt.textContent = new Date(news.created_at).toLocaleString();
        newsItem.appendChild(createdAt);

        newsContainer.appendChild(newsItem);
      });
    }
  })
  .catch(error => {
    console.error('Greška pri pozivu API-ja:', error);
  });

}

}

document.addEventListener('DOMContentLoaded', loadNews);

document.getElementById("otvori-modal").addEventListener("click", function() {
    document.getElementById("modal").style.display = "flex";
});


document.querySelector(".zatvori").addEventListener("click", function() {
    document.getElementById("modal").style.display = "none";
});

window.onclick = function(event) {
    let modal = document.getElementById("modal");
    if (event.target === modal) {
        modal.style.display = "none";
    }
};





function prikaziPrikazNovosti(novost) {
    console.log("Prikazujemo novost:", novost);

    let modalNaslov = document.getElementById("modalPrikazNovostiNaslov");
    let modalSlika = document.getElementById("modalPrikazNovostiSlika");
    let modalOpis = document.getElementById("modalPrikazNovostiOpis");

    modalNaslov.innerText = novost.title;
    modalOpis.innerText = novost.content; // Prikazuje detaljan opis

    if (novost.image_path) {
        modalSlika.src = `http://localhost:3000/${novost.image_path}`;
        modalSlika.style.display = "block";
    } else {
        modalSlika.style.display = "none";
    }

    document.getElementById("modalPrikazNovosti").style.display = "flex";
}

// Funkcija za zatvaranje modala


function zatvoriModalPrikazNovosti() {

    let modal = document.getElementById("modalPrikazNovosti"); // ✅ Tačan ID

    if (modal) {
        modal.style.display = "none";
        console.log("Modal zatvoren!");
    } 
}


let trenutnaStranica = 1;
let ukupnoStranica = 1;

document.getElementById('prev').addEventListener('click', () => {
    if (trenutnaStranica > 1) {
        trenutnaStranica--;
        dohvatiNovosti();
    }
});

// Dugme za Sledeću stranicu
document.getElementById('next').addEventListener('click', () => {
    if (trenutnaStranica < ukupnoStranica) {
        trenutnaStranica++;
        dohvatiNovosti();
    }
});


function toggleMenu() {
    const menu = document.querySelector('.mobile-menu');
    menu.style.display = menu.style.display === 'flex' ? 'none' : 'flex';

    // Dodaj event listener samo ako je meni otvoren
    if (menu.style.display === 'flex') {
        document.addEventListener("click", closeMenuOutside);
    } else {
        document.removeEventListener("click", closeMenuOutside);
    }
}
function closeMenuOutside(event) {
    const menu = document.querySelector('.mobile-menu');
    const hamburger = document.querySelector('.hamburger');

    if (!menu.contains(event.target) && !hamburger.contains(event.target)) {
        menu.style.display = 'none';
        document.removeEventListener("click", closeMenuOutside); // Ukloni event listener nakon zatvaranja
    }
}
let trenutniIndex = 0;
const slike = document.querySelectorAll(".prikaz");
const dugmad = document.querySelectorAll(".slider-nav a");
let autoSlide = setInterval(promeniNaSledecu, 4000);

function promeniSliku(index) {
    resetujSlike();
    trenutniIndex = index;
    slike[trenutniIndex].classList.add("aktivna");
    dugmad[trenutniIndex].classList.add("aktivna");

    // Resetuj automatsku promenu kada korisnik klikne
    clearInterval(autoSlide);
    autoSlide = setInterval(promeniNaSledecu, 4000);
}

function promeniNaSledecu() {
    let sledeciIndex = (trenutniIndex + 1) % slike.length;
    promeniSliku(sledeciIndex);
}

function resetujSlike() {
    slike.forEach(slika => slika.classList.remove("aktivna"));
    dugmad.forEach(dugme => dugme.classList.remove("aktivna"));
}

// Prikazi prvu sliku i aktiviraj prvo dugme na početku
promeniSliku(0);


