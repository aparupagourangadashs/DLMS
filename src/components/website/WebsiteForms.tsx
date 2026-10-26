"use client";

import { useState } from "react";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { publicBooks } from "@/lib/website/content";

export function BulkRequest() {
  const [draft, setDraft] = useState(false);
  return <div className="web-bulk">
    <div><p className="web-eyebrow">Reading together</p><h2>A place for<br /><em>publication enquiries.</em></h2><p>Preview a bulk-request form with fictional values only. No order is placed, no stock is reserved and no message is sent.</p></div>
    <form onChange={() => setDraft(false)} onSubmit={(event) => { event.preventDefault(); setDraft(true); }}>
      <div className="web-form-grid">
        {[{ name: "first", label: "First name" }, { name: "last", label: "Last name" }, { name: "email", label: "Email", type: "email" }, { name: "mobile", label: "Mobile number", type: "tel" }, { name: "city", label: "City" }, { name: "pincode", label: "Postal code" }].map((field) => <label key={field.name}><span>{field.label} *</span><input name={field.name} type={field.type ?? "text"} required maxLength={100} pattern={field.type === "email" ? undefined : ".*\\S.*"} autoComplete="off" /></label>)}
        <label className="web-form-wide"><span>Address *</span><textarea name="address" required maxLength={300} rows={2} onInput={(event) => event.currentTarget.setCustomValidity(event.currentTarget.value.trim() ? "" : "Please enter an address, not just spaces.")} /></label>
        <label><span>Publication *</span><select name="publication" required defaultValue=""><option value="" disabled>Choose a publication</option>{publicBooks.map((book) => <option key={book.image}>{book.title}</option>)}</select></label>
        <label><span>Quantity *</span><input name="quantity" type="number" min={1} max={1000} required defaultValue={10} /></label>
      </div>
      <p className="web-form-note">Demo only. Use fictional information; nothing leaves this page. Actual orders, inventory and telephone country codes are not connected.</p>
      <button className="web-btn" type="submit">Preview enquiry · Not sent<ArrowRight size={16} aria-hidden="true" /></button>
      {draft ? <p className="web-form-status" role="status"><CheckCircle2 size={19} aria-hidden="true" />Draft validated for preview. Nothing was submitted or saved.</p> : null}
    </form>
  </div>;
}
