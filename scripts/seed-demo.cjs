// Semente de demonstração — família fictícia, para experimentar a app sem
// escrever 20 pessoas à mão. Correr com: node scripts/seed-demo.cjs
//
// Apaga TUDO o que estiver na base antes de inserir. Não correr por cima de
// dados reais.
const path = require('node:path');
const { randomUUID } = require('node:crypto');
const Database = require('better-sqlite3');

const db = new Database(path.join(__dirname, '..', 'data', 'raizes.db'));
db.pragma('journal_mode = WAL');

db.exec(
  'DELETE FROM family_children; DELETE FROM families; DELETE FROM events; DELETE FROM individuals; DELETE FROM settings;',
);

const insPerson = db.prepare(
  `INSERT INTO individuals
    (id, first_name, last_name, maiden_name, gender, birth_date, birth_place,
     death_date, death_place, living, occupation, bio)
   VALUES (@id,@first_name,@last_name,@maiden_name,@gender,@birth_date,@birth_place,
     @death_date,@death_place,@living,@occupation,@bio)`,
);
function person(first, last = '', gender = 'unknown', extra = {}) {
  const id = randomUUID();
  insPerson.run({
    id,
    first_name: first,
    last_name: last,
    maiden_name: '',
    gender,
    birth_date: '',
    birth_place: '',
    death_date: '',
    death_place: '',
    living: 1,
    occupation: '',
    bio: '',
    ...extra,
  });
  return id;
}

const insFam = db.prepare(
  `INSERT INTO families (id, partner1_id, partner2_id, status, marriage_date, marriage_place)
   VALUES (?, ?, ?, ?, '', '')`,
);
function family(p1, p2, status = 'married') {
  const id = randomUUID();
  insFam.run(id, p1, p2, status);
  return id;
}

const insChild = db.prepare(
  'INSERT OR IGNORE INTO family_children (family_id, child_id) VALUES (?, ?)',
);
const child = (fam, c) => insChild.run(fam, c);

const setSetting = db.prepare(
  `INSERT INTO settings (key, value) VALUES (?, ?)
   ON CONFLICT(key) DO UPDATE SET value = excluded.value`,
);

const run = db.transaction(() => {
  // Avós
  const avoManuel = person('Manuel', 'Andrade', 'male', { living: 0, death_date: '1998' });
  const avoLucia = person('Lúcia', 'Andrade', 'female', { living: 0, death_date: '2004' });
  const famAvos = family(avoManuel, avoLucia);

  // Geração do meio — três irmãos
  const carlos = person('Carlos', 'Andrade', 'male');
  const teresa = person('Teresa', 'Andrade', 'female');
  const nuno = person('Nuno', 'Andrade', 'male');
  child(famAvos, carlos);
  child(famAvos, teresa);
  child(famAvos, nuno);

  // Ramo do Carlos — a pessoa no centro da árvore
  const beatriz = person('Beatriz', 'Ramos', 'female');
  const famCarlos = family(carlos, beatriz);
  const marta = person('Marta', 'Andrade', 'female');
  const tiago = person('Tiago', 'Andrade', 'male');
  child(famCarlos, marta);
  child(famCarlos, tiago);

  // Segunda união do Carlos — para mostrar famílias recompostas
  const sofia = person('Sofia', 'Leal', 'female');
  const famCarlosSofia = family(carlos, sofia);
  const gabriel = person('Gabriel', 'Andrade', 'male');
  child(famCarlosSofia, gabriel);

  // Ramo da Teresa
  const ricardo = person('Ricardo', 'Vieira', 'male');
  const famTeresa = family(teresa, ricardo);
  const clara = person('Clara', 'Vieira', 'female');
  child(famTeresa, clara);

  // Ramo do Nuno — mãe solteira, sem parceiro registado
  const famNuno = family(nuno, null, 'single');
  const helena = person('Helena', 'Andrade', 'female');
  child(famNuno, helena);

  // Geração seguinte — bisnetos
  const famMarta = family(marta, person('Pedro', 'Correia', 'male'));
  child(famMarta, person('Íris', 'Correia', 'female'));

  // Centrar a árvore na Marta
  setSetting.run('home_id', marta);
});

run();

// --- resumo de verificação ---
const people = db.prepare('SELECT * FROM individuals').all();
const families = db.prepare('SELECT * FROM families').all();
const links = db.prepare('SELECT * FROM family_children').all();
const nameById = Object.fromEntries(
  people.map((p) => [p.id, [p.first_name, p.last_name].filter(Boolean).join(' ')]),
);
console.log(`Pessoas: ${people.length} | Famílias: ${families.length} | Ligações filho: ${links.length}\n`);
for (const f of families) {
  const kids = links
    .filter((l) => l.family_id === f.id)
    .map((l) => nameById[l.child_id]);
  const p1 = f.partner1_id ? nameById[f.partner1_id] : '—';
  const p2 = f.partner2_id ? nameById[f.partner2_id] : '—';
  console.log(`${p1}  +  ${p2}  ->  ${kids.join(', ') || '(sem filhos)'}`);
}
db.close();
