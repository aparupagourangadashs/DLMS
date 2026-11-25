// Usage: start the app (npm run start), then `node scripts/smoke-website.mjs`. Needs the seeded catalog (`npm run db:seed`).
const base = "http://localhost:3000";
let failures = 0;
const check = (name, ok, detail = "") => {
    if (!ok) failures += 1;
    console.log(`${ok ? "PASS" : "FAIL"}  ${name}${ok ? "" : `  -> ${detail}`}`);
};
const get = async (path) => {
    const r = await fetch(base + path, { redirect: "manual" });
    // React inserts empty comment nodes between adjacent text expressions.
    return { status: r.status, text: (await r.text()).replaceAll("<!-- -->", "") };
};

const home = await get("/website");
check("home renders", home.status === 200, home.status);
check("home lists all six collections", ["ISKCON Board of Examination Courses", "Self-study Courses", "Ancient Wisdom", "Kids &amp; Parents", "Level Wise Shastric Study", "Live Classes"].every((t) => home.text.includes(t)));
check("home shows testimonials and videos from the database", home.text.includes("HH Bhanu Swami") && home.text.includes("Gopal Krishna Goswami"));
check("home shows hero figure setting", home.text.includes("31,500+"));
check("shell shows contact email setting", home.text.includes("info@iskconbm.org"));

for (const [slug, count] of [["bhagavata-mahavidyalaya", 3], ["self-study", 72], ["ancient-wisdom", 29], ["kids-parents", 9], ["level-wise", 10], ["live-classes", 4]]) {
    const page = await get(`/website/${slug}`);
    check(`catalog ${slug} lists ${count} courses`, page.status === 200 && page.text.includes(`${count} courses found`), `${page.status}`);
}

const course = await get("/website/course/bhaktivedantamodule-3-115238");
check("course detail renders", course.status === 200 && course.text.includes("At a glance") && course.text.includes("Official course page"), course.status);
check("unknown course is 404", (await get("/website/course/does-not-exist")).status === 404);
check("unknown page is 404", (await get("/website/not-a-page")).status === 404);

const books = await get("/website/books");
const covers = new Set(books.text.match(/alt="[^"]* book cover"/g) ?? []);
check("books page lists nine covers in two languages", books.status === 200 && covers.size === 9 && books.text.includes("English publications") && books.text.includes("Hindi publications"), `${books.status} covers=${covers.size}`);
check("books page has the enquiry form", books.text.includes('name="book"'));
const contact = await get("/website/contact");
check("contact shows configured email and phone", contact.status === 200 && contact.text.includes("info@iskconbm.org") && contact.text.includes("+91 95280 06565"), contact.status);
for (const slug of ["e-magazines", "our-team", "our-advisory-board-members", "terms", "privacy", "account", "iskcon-bhagavata-mahavidyalaya", "srila-prabhupada"]) {
    const page = await get(`/website/${slug}`);
    check(`${slug} renders`, page.status === 200, page.status);
}

console.log(failures === 0 ? "\nALL WEBSITE CHECKS PASSED" : `\n${failures} CHECK(S) FAILED`);
process.exitCode = failures === 0 ? 0 : 1;
