drop extension if exists "pg_net";

drop policy "Users can delete own module_data" on "public"."module_data";

drop policy "Users can insert own module_data" on "public"."module_data";

drop policy "Users can read own module_data" on "public"."module_data";

drop policy "Users can update own module_data" on "public"."module_data";


  create policy "Allow anon delete module_data"
  on "public"."module_data"
  as permissive
  for delete
  to public
using (true);



  create policy "Allow anon insert module_data"
  on "public"."module_data"
  as permissive
  for insert
  to public
with check (true);



  create policy "Allow anon read module_data"
  on "public"."module_data"
  as permissive
  for select
  to public
using (true);



  create policy "Allow anon update module_data"
  on "public"."module_data"
  as permissive
  for update
  to public
using (true);



