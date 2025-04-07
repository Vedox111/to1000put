const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const multer = require('multer');
const path = require('path');
const app = express();
const port = 3000;

// Middleware
app.use(bodyParser.json({ limit: '10mb' }));
app.use(bodyParser.urlencoded({ limit: '10mb', extended: true }));
app.use(cors());

// Omogućavamo statičke fajlove (slike) iz direktorijuma 'public'
app.use('/images', express.static(path.join(__dirname, 'public/images')));

// Kreiranje konekcije s bazom
const db = mysql.createPool({
  host: 'localhost',
  user: 'root',
  password: '',
  database: 'web',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

const JWT_SECRET = 'tvoj_tajni_kljuc';

// Middleware za provjeru JWT tokena (ako je potrebno kasnije)
// const authenticateJWT = (req, res, next) => {
//   const token = req.header('Authorization')?.split(' ')[1]; // 'Bearer token' format
//   if (!token) {
//     return res.status(403).send({ status: 'error', message: 'Prvo se prijavite.' });
//   }
//
//   jwt.verify(token, JWT_SECRET, (err, user) => {
//     if (err) {
//       return res.status(403).send({ status: 'error', message: 'Neispravan ili istekao token.' });
//     }
//     req.user = user;
//     next();
//   });
// };

// Ruta za login
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) {
    return res.status(400).send({ status: 'error', message: 'Korisničko ime i lozinka su obavezni!' });
  }
  const query = 'SELECT * FROM users WHERE username = ?';
  db.query(query, [username], (err, results) => {
    if (err) return res.status(500).send({ status: 'error', message: 'Greška pri prijavi.' });
    if (results.length === 0) return res.status(401).send({ status: 'error', message: 'Pogrešno korisničko ime.' });
    
    const user = results[0];
    bcrypt.compare(password, user.password, (err, isMatch) => {
      if (err) return res.status(500).send({ status: 'error', message: 'Greška pri provjeri lozinke.' });
      if (!isMatch) return res.status(401).send({ status: 'error', message: 'Pogrešna lozinka.' });
      
      const token = jwt.sign({ id: user.id, username: user.username, isAdmin: user.isAdmin }, JWT_SECRET, { expiresIn: '1h' });
      res.send({ status: 'success', message: 'Prijava uspješna!', token });
    });
  });
});

// Konfiguracija za multer - za upload slika
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'public/images');  // Odredi direktorij za spremanje slika
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);  // Ekstenzija fajla
    cb(null, Date.now() + ext);  // Spremi sliku sa jedinstvenim imenom
  }
});
const upload = multer({ storage: storage });

// Ruta za dodavanje novosti sa slikom
app.post('/add-news', upload.single('slika'), (req, res) => {
  const { title, content, short, expires_at, is_pinned } = req.body;
  const slika = req.file;

  console.log("Podaci sa servera:");
  console.log("Naslov:", title);
  console.log("Opis:", content);
  console.log("Kratki opis:", short);
  console.log("Datum isteka:", expires_at);
  console.log("Pinovana:", is_pinned);
  console.log("Slika:", slika);

  // Provera da li su svi podaci prisutni (ne uključuje više expires_at jer može biti opcionalan)
  if (!title || !content || !short || !slika) {
      return res.status(400).send({ status: 'error', message: 'Svi podaci moraju biti popunjeni!' });
  }

  const imagePath = `images/${slika.filename}`;
  const pinned = is_pinned === 'true'; // jer stiže kao string iz FormData

  const query = `
      INSERT INTO news (title, content, short, expires_at, image_path, ispinned, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  const values = [
      title,
      content,
      short,
      expires_at || null, // Ako nema expires_at, ide NULL
      imagePath,
      pinned,
      new Date()
  ];

  db.query(query, values, (err, result) => {
      if (err) {
          console.error('Greška pri unosu novosti:', err);
          return res.status(500).send({ status: 'error', message: 'Došlo je do greške pri dodavanju novosti.' });
      }

      console.log('Novost uspešno dodata:', result);
      res.status(200).send({ status: 'success', message: 'Novost uspešno dodata!' });
  });
});

// Ruta za dohvat broja objava
app.get('/get-news-count', (req, res) => {
  db.query('SELECT COUNT(*) AS count FROM news', (err, result) => {
    if (err) {
      console.error('Greška pri dohvatku broja objava:', err);
      return res.status(500).send({ status: 'error', message: 'Greška pri dohvatku broja objava.' });
    }
    res.send({ count: result[0].count });
  });
});

// Endpoint za dohvat novosti sa paginacijom
app.get('/get-news', (req, res) => {
  const page = parseInt(req.query.page) || 1;  // Stranica, default 1
  const limit = parseInt(req.query.limit) || 6;  // Limit, default 6
  const offset = (page - 1) * limit;  // Offset za SQL upit (koja je početna pozicija)

  console.log(`Paginacija: Stranica ${page}, Limit ${limit}, Offset ${offset}`);

  // SQL upit za dohvat novosti sa paginacijom
  db.query('SELECT * FROM news ORDER BY ispinned DESC, created_at DESC LIMIT ? OFFSET ?', [limit, offset], (err, results) => {
    if (err) {
        console.error('Greška pri dohvatku novosti:', err);
        return res.status(500).send({ status: 'error', message: 'Greška pri dohvatku novosti.' });
    }

    db.query('SELECT COUNT(*) AS count FROM news', (err, countResult) => {
        if (err) {
            console.error('Greška pri dohvatku broja novosti:', err);
            return res.status(500).send({ status: 'error', message: 'Greška pri dohvatku broja novosti.' });
        }

        const totalNewsCount = countResult[0].count;
        const totalPages = Math.ceil(totalNewsCount / limit);

        results.forEach(novost => {
            const expiresAt = novost.expires_at ? new Date(novost.expires_at) : null;

            if (expiresAt && expiresAt < new Date()) {
                novost.isExpired = true;
            } else {
                novost.isExpired = false;
                novost.expires_in = expiresAt ? expiresAt.getTime() - new Date().getTime() : null;
            }
        });

        res.json({
            novosti: results,
            totalPages: totalPages
        });
    });
});
});

// Ruta za brisanje novosti
app.delete('/delete-news/:id', (req, res) => {
  const newsId = req.params.id;
  const query = 'DELETE FROM news WHERE id = ?';
  db.query(query, [newsId], (err, result) => {
    if (err) {
      console.error('❌ Greška pri brisanju novosti:', err);
      return res.status(500).send({ status: 'error', message: 'Greška pri brisanju novosti.' });
    }

    res.send({ status: 'success', message: '✅ Novost uspješno obrisana!' });
  });
});



// Ruta za ažuriranje novosti
app.post('/update-news/:id', (req, res) => {
  const { title, content, short, expires_at } = req.body;
  const id = req.params.id;
  let expiresAt = null;

  // Ako je datum isteka prisutan, pretvaramo ga u datum
  if (expires_at) {
      expiresAt = new Date(expires_at);  // Datumi su u ISO formatu
  }

  const query = 'UPDATE news SET title = ?, content = ?, short = ?, expires_at = ? WHERE id = ?';
  db.query(query, [title, content, short, expiresAt, id], (err, result) => {
      if (err) {
          console.error('Greška pri izmeni novosti:', err);
          return res.status(500).send({ status: 'error', message: 'Greška pri izmeni novosti.' });
      }

      res.json({ message: 'Novost uspešno izmenjena!' });
  });
});

// Pretpostavljamo da koristiš MongoDB i Mongoose


// API za učitavanje novosti sa paginacijom
// Endpoint za dohvat novosti sa paginacijom
app.get('/dohvati-novosti', (req, res) => {
  const page = parseInt(req.query.page) || 1;  // Ako stranica nije prosleđena, podrazumevana je 1
  const limit = 6;  // Broj novosti po stranici
  const offset = (page - 1) * limit;  // Offset za SQL upit

  console.log(`Paginacija: Stranica ${page}, Limit ${limit}, Offset ${offset}`);  // Log za proveru

  // SQL upit za dohvat novosti sa paginacijom
  db.query('SELECT * FROM news LIMIT ? OFFSET ?', [limit, offset], (err, results) => {
      if (err) {
          console.error('Greška pri dohvatku novosti:', err);
          return res.status(500).send({ status: 'error', message: 'Greška pri dohvatku novosti.' });
      }
      
      console.log(`Dohvaćene novosti: ${results.length} novosti`);  // Log za broj novosti koji se vraća
      res.json({ novosti: results });
  });
});

// Endpoint za dohvat broja novosti u bazi
app.get('/dohvati-broj-novosti', (req, res) => {
  db.query('SELECT COUNT(*) AS count FROM news', (err, result) => {
      if (err) {
          console.error('Greška pri dohvatku broja novosti:', err);
          return res.status(500).send({ status: 'error', message: 'Greška pri dohvatku broja novosti.' });
      }
      
      console.log(`Ukupno novosti: ${result[0].count}`);  // Log za broj novosti u bazi
      res.send({ count: result[0].count });
  });
});

app.post('/updateRaspored', (req, res) => {
  const updatedRows = req.body.rows;

  // Brisanje starog rasporeda (može se prilagoditi ako treba ažurirati pojedinačne redove)
  const deleteSQL = 'DELETE FROM raspored';
  db.query(deleteSQL, (err) => {
    if (err) {
      console.error('Greška pri brisanju podataka:', err);
      return res.json({ success: false });
    }

    // Ubacivanje novih podataka
    const insertSQL = `INSERT INTO raspored 
      (ponedjeljak, ponedjeljak_time, utorak, utorak_time, srijeda, srijeda_time, 
      cetvrtak, cetvrtak_time, petak, petak_time, subota, subota_time) 
      VALUES ?`;

    const values = updatedRows.map(row => [
      row.ponedjeljak || null, row.ponedjeljak_time || null,
      row.utorak || null, row.utorak_time || null,
      row.srijeda || null, row.srijeda_time || null,
      row.cetvrtak || null, row.cetvrtak_time || null,
      row.petak || null, row.petak_time || null,
      row.subota || null, row.subota_time || null
    ]);

    db.query(insertSQL, [values], (err, result) => {
      if (err) {
        console.error('Greška pri dodavanju podataka:', err);
        return res.json({ success: false });
      }

      console.log('Raspored uspešno ažuriran!');
      res.json({ success: true });
    });
  });
});
// API endpoint za raspored
app.get('/getRaspored', (req, res) => {
  const sql = 'SELECT * FROM raspored';
  db.query(sql, (err, results) => {
    if (err) {
      console.error('Greška prilikom upita:', err);
      return res.json({ success: false });
    }
    res.json({ rows: results });
  });
});


app.post('/edit-news', upload.single('slika'), (req, res) => {
  const { id, naslov, short, opis, expires_at, is_pinned } = req.body;  // Dodano is_pinned
  let slikaPath = req.file ? 'images/' + req.file.filename : null;  // Ako postoji slika, uzimamo njen path
  
  // Proverite da li je expires_at prazan, ako jeste postavite ga na null
  let expiresAt = expires_at ? new Date(expires_at) : null;  // Ako expires_at nije unesen, ostaje null

  // Provera da li je ID validan
  if (!id || !naslov || !short || !opis) {
      return res.status(400).json({ status: 'error', message: 'Svi podaci moraju biti popunjeni!' });
  }

  // Ako slika nije postavljena, uzimamo trenutnu sliku iz baze
  let sql = 'SELECT image_path, ispinned, expires_at FROM news WHERE id = ?';
  db.query(sql, [id], (err, result) => {
    if (err) {
      console.error('Greška pri preuzimanju postojeće slike:', err);
      return res.status(500).json({ status: 'error', message: 'Greška pri preuzimanju postojeće slike.' });
    }

    // Ako slika nije postavljena (req.file je null), koristi trenutnu sliku
    if (!slikaPath) {
      slikaPath = result[0]?.image_path;  // Uzimamo postojeći image_path iz baze
    }

    // Ako nije postavljen status za pinovanje, uzimamo trenutni status (ispinned)
    let updatedIspinned = is_pinned === '1' ? 1 : 0; // Ako je is_pinned "1", pinuj, ako je "0" odpinuj
    
    // Ako je expires_at null, zadržavamo vrednost iz baze
    if (!expiresAt) {
      expiresAt = result[0]?.expires_at; // Ako nije unesen, zadrži prethodni datum
    }

    console.log("Ažurirani podaci za novost:", {
      naslov,
      short,
      opis,
      slikaPath,
      expiresAt,
      updatedIspinned
    });

    // SQL upit za update novosti sa ispinned kolonom
    sql = 'UPDATE news SET title = ?, short = ?, content = ?, image_path = ?, expires_at = ?, ispinned = ? WHERE id = ?';
    db.query(sql, [naslov, short, opis, slikaPath, expiresAt, updatedIspinned, id], (err, result) => {
      if (err) {
          console.error('Greška pri ažuriranju novosti:', err);
          return res.status(500).json({ status: 'error', message: 'Došlo je do greške pri ažuriranju novosti.' });
      }

      return res.json({ status: 'success', message: 'Novost je uspešno ažurirana.' });
    });
  });
});
// Pokretanje servera
app.listen(port, () => console.log(`🚀 Server pokrenut na portu ${port}`));
