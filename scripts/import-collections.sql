-- Auto-generated collection import from Excel تحصيلات files
-- Generated: 2026-06-12T14:36:34.417Z
-- Run this in Supabase SQL Editor

BEGIN;

-- File: المبيعات و التحصيلات لشهر ابريل 2026.xlsx (sheet: التحصيلات )
INSERT INTO public.collection_transactions (project_code, project_name, client, collection_date, collection_month, amount, currency, notes, source_type, source_file_name, source_row_key, dedupe_key, status)
VALUES ('PZ-018', '2308-23-08 - حمامات سباحة الابراج الصينية - الشركة الصينية CSCEC', 'الشركة الصينية العامة للهندسة المعمارية بمصر', '2026-04-02', '2026-04-01', 1287570.68, 'EGP', 'تحويل بنكى- من الشركة الصينة عن مستخلص رقم 5 عن اعمال فى مشروع الابراج الصينية العاصمة', 'import', 'المبيعات و التحصيلات لشهر ابريل 2026.xlsx', 'row-1', 'excel:2026-04-01:2026-04-02:2308:1287570.68', 'posted')
ON CONFLICT (dedupe_key) DO NOTHING;

INSERT INTO public.collection_transactions (project_code, project_name, client, collection_date, collection_month, amount, currency, notes, source_type, source_file_name, source_row_key, dedupe_key, status)
VALUES ('PZ-037', '2265-22-65 - فيلا ليلي اكرم - المعادي', 'ليلى اكرم', '2026-04-04', '2026-04-01', 193869.00, 'EGP', 'تحويل بنكى - من ليلى اكرم عن مطالبة اعمال صيانة حمام سباحة', 'import', 'المبيعات و التحصيلات لشهر ابريل 2026.xlsx', 'row-2', 'excel:2026-04-01:2026-04-04:2265:193869', 'posted')
ON CONFLICT (dedupe_key) DO NOTHING;

INSERT INTO public.collection_transactions (project_code, project_name, client, collection_date, collection_month, amount, currency, notes, source_type, source_file_name, source_row_key, dedupe_key, status)
VALUES ('PZ-028', '2333-23-33 - Aqua tonic - المنصورة 7 - شركة انسباير', 'انسباير للبناء والتصميمات', '2026-04-06', '2026-04-01', 250000.00, 'EGP', 'حافظة استلام اوراق القبض رقم 31 بتاريخ 06-04-2026 شيك رقم 13817001231064 من البنك الاهلى المصرى دفعه من مستخلص رقم 3 مشروع المنصوره شركه انسباير', 'import', 'المبيعات و التحصيلات لشهر ابريل 2026.xlsx', 'row-3', 'excel:2026-04-01:2026-04-06:2333:250000', 'posted')
ON CONFLICT (dedupe_key) DO NOTHING;

INSERT INTO public.collection_transactions (project_code, project_name, client, collection_date, collection_month, amount, currency, notes, source_type, source_file_name, source_row_key, dedupe_key, status)
VALUES ('PZ-034', '1079-توريدات لاينر سول - أمر شراء 78 - إعمار- الساحل - 1079', 'البرو نورث كوست لادارة الممتلكات العقارية', '2026-04-07', '2026-04-01', 6201069.70, 'EGP', 'تحويل بنكى- عن مطالبة رقم 1 مشروع تووريدات سول لاينر عن امر شراء رقم 78 شركة البرو نورث', 'import', 'المبيعات و التحصيلات لشهر ابريل 2026.xlsx', 'row-4', 'excel:2026-04-01:2026-04-07:1079:6201069.7', 'posted')
ON CONFLICT (dedupe_key) DO NOTHING;

INSERT INTO public.collection_transactions (project_code, project_name, client, collection_date, collection_month, amount, currency, notes, source_type, source_file_name, source_row_key, dedupe_key, status)
VALUES ('PZ-015', '2413-24-13 - ساراي كافانا - بحيرة - مدينة مصر - طريق السويس', 'مدينة مصر للاسكان والتعمير', '2026-04-07', '2026-04-01', 1916487.03, 'EGP', 'حافظة استلام اوراق القبض رقم 32 بتاريخ 07-04-2026 استلام شيك رقم 000547281090 وتم ايداعه فى بنك سايب 10460 عن مستخلص رقم 6 مشروع سراى شركه مدينه مصر بتاريخ 7-4-2026', 'import', 'المبيعات و التحصيلات لشهر ابريل 2026.xlsx', 'row-5', 'excel:2026-04-01:2026-04-07:2413:1916487.03', 'posted')
ON CONFLICT (dedupe_key) DO NOTHING;

INSERT INTO public.collection_transactions (project_code, project_name, client, collection_date, collection_month, amount, currency, notes, source_type, source_file_name, source_row_key, dedupe_key, status)
VALUES ('PZ-015', '2413-24-13 - ساراي كافانا - بحيرة - مدينة مصر - طريق السويس', 'مدينة مصر للاسكان والتعمير', '2026-04-07', '2026-04-01', 38962.44, 'EGP', 'حافظة استلام اوراق القبض رقم 33 بتاريخ 07-04-2026 استلام شيك رقم000547280653 وتم ايداعه فى بنك سايب 10460 عن قيمه تلفيات فى موقع سراى شركه مدينه مصر', 'import', 'المبيعات و التحصيلات لشهر ابريل 2026.xlsx', 'row-6', 'excel:2026-04-01:2026-04-07:2413:38962.44', 'posted')
ON CONFLICT (dedupe_key) DO NOTHING;

INSERT INTO public.collection_transactions (project_code, project_name, client, collection_date, collection_month, amount, currency, notes, source_type, source_file_name, source_row_key, dedupe_key, status)
VALUES ('PZ-038', '1040-حمام سباحة WBR1 - ووتر واي', 'ايديا فيردى للاستثمار العقارى', '2026-04-09', '2026-04-01', 230000.00, 'EGP', 'حافظة استلام اوراق القبض رقم 34 بتاريخ 09-04-2026 شيك من ايديا فيردى عن مستخلص رقم 6 مشروع WBR1 حمام سباحة من بنك CIB بشيك رقم 547051844', 'import', 'المبيعات و التحصيلات لشهر ابريل 2026.xlsx', 'row-7', 'excel:2026-04-01:2026-04-09:1040:230000', 'posted')
ON CONFLICT (dedupe_key) DO NOTHING;

INSERT INTO public.collection_transactions (project_code, project_name, client, collection_date, collection_month, amount, currency, notes, source_type, source_file_name, source_row_key, dedupe_key, status)
VALUES ('PZ-035', '1029-صيانة وتوريدات سوان ليك الساحل- الاصدقاء', 'الاصدقاء للتنمية السياحية', '2026-04-09', '2026-04-01', 231989.00, 'EGP', 'حافظة استلام اوراق القبض رقم 35 بتاريخ 09-04-2026 شيك من شركة الاصدقاء عن مشروع توريدات الاصدقاء الساحل من البنك العقارى المصرى العربى بشيك رقم 2121889536', 'import', 'المبيعات و التحصيلات لشهر ابريل 2026.xlsx', 'row-8', 'excel:2026-04-01:2026-04-09:1029:231989', 'posted')
ON CONFLICT (dedupe_key) DO NOTHING;

INSERT INTO public.collection_transactions (project_code, project_name, client, collection_date, collection_month, amount, currency, notes, source_type, source_file_name, source_row_key, dedupe_key, status)
VALUES ('PZ-004', '2508-The Waterway- عدد 23 حمام سباحة و 3 نوافير - ووترواى - الساحل - 08-25', 'ايديا فيردى للاستثمار العقارى', '2026-04-09', '2026-04-01', 1214654.18, 'EGP', 'حافظة استلام اوراق القبض رقم 36 بتاريخ 09-04-2026 شيك من ايديا فيردى عن اعما اضافية فى مشروع ووتر واى الساحل من بنك CIB بشيك رقم 547051828', 'import', 'المبيعات و التحصيلات لشهر ابريل 2026.xlsx', 'row-9', 'excel:2026-04-01:2026-04-09:2508:1214654.18', 'posted')
ON CONFLICT (dedupe_key) DO NOTHING;

INSERT INTO public.collection_transactions (project_code, project_name, client, collection_date, collection_month, amount, currency, notes, source_type, source_file_name, source_row_key, dedupe_key, status)
VALUES ('PZ-004', '2508-The Waterway- عدد 23 حمام سباحة و 3 نوافير - ووترواى - الساحل - 08-25', 'ايديا فيردى للاستثمار العقارى', '2026-04-09', '2026-04-01', 367229.66, 'EGP', 'حافظة استلام اوراق القبض رقم 37 بتاريخ 09-04-2026 شيك من ايديا فيردى عن اعمال اضافية مشروع ووتر واى الساحل عن فاتورة 1947 من بنك cib بشيك رقم و تم ايداعة فى بنك سايب 10460 547051829', 'import', 'المبيعات و التحصيلات لشهر ابريل 2026.xlsx', 'row-10', 'excel:2026-04-01:2026-04-09:2508:367229.66', 'posted')
ON CONFLICT (dedupe_key) DO NOTHING;

INSERT INTO public.collection_transactions (project_code, project_name, client, collection_date, collection_month, amount, currency, notes, source_type, source_file_name, source_row_key, dedupe_key, status)
VALUES ('PZ-019', '2504-سوان ليك - تجديد بحيرات - حسن علام - أكتوبر - 04-25', 'ابناء مصر للاستثمار السياحى', '2026-04-09', '2026-04-01', 1075948.37, 'EGP', 'حافظة استلام اوراق القبض رقم 38 بتاريخ 09-04-2026 شيك من شركة ابناء مصر عن مستخلص رقم 2 مشروع سوان ليك اكتوبر من بنك العقارى المصرى العربى بشيك رقم 2121718322 و تم ايداعة فى سايب 10460', 'import', 'المبيعات و التحصيلات لشهر ابريل 2026.xlsx', 'row-11', 'excel:2026-04-01:2026-04-09:2504:1075948.37', 'posted')
ON CONFLICT (dedupe_key) DO NOTHING;

INSERT INTO public.collection_transactions (project_code, project_name, client, collection_date, collection_month, amount, currency, notes, source_type, source_file_name, source_row_key, dedupe_key, status)
VALUES ('PZ-015', '2413-24-13 - ساراي كافانا - بحيرة - مدينة مصر - طريق السويس', 'مدينة مصر للاسكان والتعمير', '2026-04-09', '2026-04-01', 1500000.00, 'EGP', 'حافظة استلام اوراق القبض رقم 39 بتاريخ 09-04-2026 شيك رقم 000547281097 من بنك CIB دفعه تحت حساب مستخص رقم 7 مشروع سراى شركه مدينه مصر', 'import', 'المبيعات و التحصيلات لشهر ابريل 2026.xlsx', 'row-12', 'excel:2026-04-01:2026-04-09:2413:1500000', 'posted')
ON CONFLICT (dedupe_key) DO NOTHING;

INSERT INTO public.collection_transactions (project_code, project_name, client, collection_date, collection_month, amount, currency, notes, source_type, source_file_name, source_row_key, dedupe_key, status)
VALUES ('PZ-009', '2512-زويا (PH 01 PART 3) - بحيرة - LMD - الساحل - 12-25', 'لاند مارك للتنمية العقارية', '2026-04-09', '2026-04-01', 7687984.26, 'EGP', 'حافظة استلام اوراق القبض رقم 40 بتاريخ 09-04-2026 شيك من لاند مارك عن مستخلص رقم 1 مشروع زويا phase1 part 3 من البنك العربى الافريقى بشيك رقم 947842766', 'import', 'المبيعات و التحصيلات لشهر ابريل 2026.xlsx', 'row-13', 'excel:2026-04-01:2026-04-09:2512:7687984.26', 'posted')
ON CONFLICT (dedupe_key) DO NOTHING;

INSERT INTO public.collection_transactions (project_code, project_name, client, collection_date, collection_month, amount, currency, notes, source_type, source_file_name, source_row_key, dedupe_key, status)
VALUES ('PZ-003', '2403-24-03 - soul Phase 1C - الساحل - Redcon', 'ريدكون للتعمير', '2026-04-12', '2026-04-01', 2000000.00, 'EGP', 'حافظة استلام اوراق القبض رقم 41 بتاريخ 12-04-2026 شيك من ريدكون عن مستخلص رقم 5 مشروع سول ريدكون من بنك قناه السويس بشيك رقم 7000326305', 'import', 'المبيعات و التحصيلات لشهر ابريل 2026.xlsx', 'row-14', 'excel:2026-04-01:2026-04-12:2403:2000000', 'posted')
ON CONFLICT (dedupe_key) DO NOTHING;

INSERT INTO public.collection_transactions (project_code, project_name, client, collection_date, collection_month, amount, currency, notes, source_type, source_file_name, source_row_key, dedupe_key, status)
VALUES ('PZ-004', '2511-رأس الحكمة - عدد 6 حمام سباحة و 2 نافورة - Orascom - الساحل - 11-25', 'اوراسكوم للانشاءات', '2026-04-18', '2026-04-01', 5889926.53, 'EGP', 'حافظة استلام اوراق القبض رقم 43 بتاريخ 18-04-2026 شيك من اوراسكوم عن مستخلص رقم 2 مشروع راس الحكمة من بنك CIB بشيك رقم 552576658 و تم ايداعة فى بنك الامارات دبى', 'import', 'المبيعات و التحصيلات لشهر ابريل 2026.xlsx', 'row-16', 'excel:2026-04-01:2026-04-18:2511:5889926.53', 'posted')
ON CONFLICT (dedupe_key) DO NOTHING;

INSERT INTO public.collection_transactions (project_code, project_name, client, collection_date, collection_month, amount, currency, notes, source_type, source_file_name, source_row_key, dedupe_key, status)
VALUES ('PZ-004', '2511-رأس الحكمة - عدد 6 حمام سباحة و 2 نافورة - Orascom - الساحل - 11-25', 'اوراسكوم للانشاءات', '2026-04-20', '2026-04-01', 11309400.18, 'EGP', 'حافظة استلام اوراق القبض رقم 44 بتاريخ 20-04-2026 شيك عن مستخلص رقم 2 و 3 من العميل اوراسكوم عن مشروع راس الحكمة بشيك رقم 13000533757 من بنك قناة السويس و تم ايداعه في بنك الامارات دبي', 'import', 'المبيعات و التحصيلات لشهر ابريل 2026.xlsx', 'row-17', 'excel:2026-04-01:2026-04-20:2511:11309400.18', 'posted')
ON CONFLICT (dedupe_key) DO NOTHING;

INSERT INTO public.collection_transactions (project_code, project_name, client, collection_date, collection_month, amount, currency, notes, source_type, source_file_name, source_row_key, dedupe_key, status)
VALUES ('PZ-002', '2402-24-02 - soul Parcel 3&4 - الساحل - Orascom', 'اوراسكوم للانشاءات', '2026-04-20', '2026-04-01', 7761632.14, 'EGP', 'حافظة استلام اوراق القبض رقم 45 بتاريخ 20-04-2026 شيك من شركة اوراسكوم عن مشروع سول اوراسكوم عن مستخلص رقم 8 من بنك قناة السويس بشيك رقم 13000533822', 'import', 'المبيعات و التحصيلات لشهر ابريل 2026.xlsx', 'row-18', 'excel:2026-04-01:2026-04-20:2402:7761632.14', 'posted')
ON CONFLICT (dedupe_key) DO NOTHING;

INSERT INTO public.collection_transactions (project_code, project_name, client, collection_date, collection_month, amount, currency, notes, source_type, source_file_name, source_row_key, dedupe_key, status)
VALUES ('PZ-021', '2414-24-14 - اي سيتي - حمامات سباحة - كيرف - الاوسطي', 'دار المعمار للمقاولات والمشروعات', '2026-04-22', '2026-04-01', 340832.03, 'EGP', 'حافظة استلام اوراق القبض رقم 46 بتاريخ 22-04-2026 شيك من دار المعمار عن مستخلص رقم 8 عن مشروع icity من بنك EG BANK بشيك رقم 4600069098', 'import', 'المبيعات و التحصيلات لشهر ابريل 2026.xlsx', 'row-19', 'excel:2026-04-01:2026-04-22:2414:340832.03', 'posted')
ON CONFLICT (dedupe_key) DO NOTHING;

INSERT INTO public.collection_transactions (project_code, project_name, client, collection_date, collection_month, amount, currency, notes, source_type, source_file_name, source_row_key, dedupe_key, status)
VALUES ('PZ-033', '1070-توريدات سول - أمر شراء 343 - إعمار- الساحل - 1070', 'البرو نورث كوست لادارة الممتلكات العقارية', '2026-04-23', '2026-04-01', 49937989.26, 'EGP', 'تحويل بنكى - من البرو نورث عن مطالبة رقم 2 و 3 مشروع توريدات سول لاينر عن امر شراء رقم 343', 'import', 'المبيعات و التحصيلات لشهر ابريل 2026.xlsx', 'row-20', 'excel:2026-04-01:2026-04-23:1070:49937989.26', 'posted')
ON CONFLICT (dedupe_key) DO NOTHING;

INSERT INTO public.collection_transactions (project_code, project_name, client, collection_date, collection_month, amount, currency, notes, source_type, source_file_name, source_row_key, dedupe_key, status)
VALUES ('PZ-028', '2333-23-33 - Aqua tonic - المنصورة 7 - شركة انسباير', 'انسباير للبناء والتصميمات', '2026-04-26', '2026-04-01', 250000.00, 'EGP', 'حافظة استلام اوراق القبض رقم 47 بتاريخ 26-04-2026 شيك رقم 13817001231074 من بنك الاهلى المصرى دفعه من مستخلص رقم 4 مشروع المنصوره 7 AQUA TONIC شركه انسباير', 'import', 'المبيعات و التحصيلات لشهر ابريل 2026.xlsx', 'row-21', 'excel:2026-04-01:2026-04-26:2333:250000', 'posted')
ON CONFLICT (dedupe_key) DO NOTHING;

INSERT INTO public.collection_transactions (project_code, project_name, client, collection_date, collection_month, amount, currency, notes, source_type, source_file_name, source_row_key, dedupe_key, status)
VALUES ('PZ-036', '2603-فيلا (36) دينا رأفت - حمام سباحة - بامبو بالم هيلز - 03-26', 'دينا علي احمد رأفت', '2026-04-14', '2026-04-01', 400000.00, 'EGP', 'حافظة استلام اوراق القبض رقم 42 بتاريخ 14-04-2026 استلام دفعة مقدمة عن مشروع حمام سباحة فيلا ا/ دينا رأفت بشيك رقم 000303688645-البنك التجارى الدولى', 'import', 'المبيعات و التحصيلات لشهر ابريل 2026.xlsx', 'row-22', 'excel:2026-04-01:2026-04-14:2603:400000', 'posted')
ON CONFLICT (dedupe_key) DO NOTHING;

-- File: المبيعات و التحصيلات لشهر مايو 2026.xlsx (sheet: تحصيلات)
INSERT INTO public.collection_transactions (project_code, project_name, client, collection_date, collection_month, amount, currency, notes, source_type, source_file_name, source_row_key, dedupe_key, status)
VALUES ('PZ-015', '2413-24-13 - ساراي كافانا - بحيرة - مدينة مصر - طريق السويس', 'مدينة مصر للاسكان والتعمير', '2026-05-03', '2026-05-01', 1016013.45, 'EGP', 'حافظة استلام اوراق القبض رقم 48 بتاريخ 03-05-2026 شيك رقم 000547281040 من بنك CIB عن مستخلص رقم 7 عن اعمال تنفيذ بحيره صناعيه لاجون كافانا مشروع سراى مدينه مصر', 'import', 'المبيعات و التحصيلات لشهر مايو 2026.xlsx', 'row-1', 'excel:2026-05-01:2026-05-03:2413:1016013.45', 'posted')
ON CONFLICT (dedupe_key) DO NOTHING;

INSERT INTO public.collection_transactions (project_code, project_name, client, collection_date, collection_month, amount, currency, notes, source_type, source_file_name, source_row_key, dedupe_key, status)
VALUES ('PZ-005', '2419-رملة - 41 حمام سباحة - مراكز العقارية - الساحل - 19-24', 'شركة ايتاب للاستثمارات العقارية والسياحية', '2026-05-05', '2026-05-01', 1700106.81, 'EGP', 'تحويل بنكي - من ايتاب عن مستخلص رقم 7 عن مشروع رملة', 'import', 'المبيعات و التحصيلات لشهر مايو 2026.xlsx', 'row-2', 'excel:2026-05-01:2026-05-05:2419:1700106.81', 'posted')
ON CONFLICT (dedupe_key) DO NOTHING;

INSERT INTO public.collection_transactions (project_code, project_name, client, collection_date, collection_month, amount, currency, notes, source_type, source_file_name, source_row_key, dedupe_key, status)
VALUES ('PZ-007', '2421- 24-21 - الساحل - HAC -حمام سباحة 20 - R8', 'اتش ايه للانشاءات', '2026-05-05', '2026-05-01', 500000.00, 'EGP', 'تحويل بنكي - دفعة من شركة حسن علام عن مستخلص رقم 10 عن مشروع R8', 'import', 'المبيعات و التحصيلات لشهر مايو 2026.xlsx', 'row-3', 'excel:2026-05-01:2026-05-05:2421:500000', 'posted')
ON CONFLICT (dedupe_key) DO NOTHING;

INSERT INTO public.collection_transactions (project_code, project_name, client, collection_date, collection_month, amount, currency, notes, source_type, source_file_name, source_row_key, dedupe_key, status)
VALUES ('PZ-009', '2404-24-04 - Zoya - Phase 01 - شركة لاند مارك', 'لاند مارك للتنمية العقارية', '2026-05-06', '2026-05-01', 139079.77, 'EGP', 'حافظة استلام اوراق القبض رقم 50 بتاريخ 06-05-2026 شيك عن اعمال صيانة بحيرة زويا المرحلة الاولي عن مشروع زويا 2404 بشيك رقم 947842784 من البنك العربي الافريقي', 'import', 'المبيعات و التحصيلات لشهر مايو 2026.xlsx', 'row-5', 'excel:2026-05-01:2026-05-06:2404:139079.77', 'posted')
ON CONFLICT (dedupe_key) DO NOTHING;

INSERT INTO public.collection_transactions (project_code, project_name, client, collection_date, collection_month, amount, currency, notes, source_type, source_file_name, source_row_key, dedupe_key, status)
VALUES ('PZ-014', '2510-فيلا زويا م عمرو سلطان - حمام سباحة - LMD - الساحل - 10-25', 'لاند مارك للتنمية العقارية', '2026-05-06', '2026-05-01', 1214024.35, 'EGP', 'حافظة استلام اوراق القبض رقم 53 بتاريخ 06-05-2026 استلام دفعة عن مستخلص رقم 2 مستخلص ختامى من شركة لاند مارك مشروع حمام سباحة فيلا عمرو سلطان بشيك رقم 947842786 من البنك العربى الافريقى و تم ايداع فى سايب', 'import', 'المبيعات و التحصيلات لشهر مايو 2026.xlsx', 'row-6', 'excel:2026-05-01:2026-05-06:2510:1214024.35', 'posted')
ON CONFLICT (dedupe_key) DO NOTHING;

INSERT INTO public.collection_transactions (project_code, project_name, client, collection_date, collection_month, amount, currency, notes, source_type, source_file_name, source_row_key, dedupe_key, status)
VALUES ('PZ-002', '2402-24-02 - soul Parcel 3&4 - الساحل - Orascom', 'اوراسكوم للانشاءات', '2026-05-10', '2026-05-01', 4000000.00, 'EGP', 'حافظة استلام اوراق القبض رقم 52 بتاريخ 10-05-2026 شيك من اوراسكوم من تحت حساب مستخلص رقم 7 مشروع سول اوراسكوم من بنك مصر بشيك رقم 99707693', 'import', 'المبيعات و التحصيلات لشهر مايو 2026.xlsx', 'row-7', 'excel:2026-05-01:2026-05-10:2402:4000000', 'posted')
ON CONFLICT (dedupe_key) DO NOTHING;

INSERT INTO public.collection_transactions (project_code, project_name, client, collection_date, collection_month, amount, currency, notes, source_type, source_file_name, source_row_key, dedupe_key, status)
VALUES ('PZ-006', '2506-بحيرات العلمين - أبراج الداون تاون - الشركة الصينية -الساحل - 06-25', 'الشركة الصينية العامة للهندسة المعمارية بمصر', '2026-05-10', '2026-05-01', 472600.21, 'EGP', 'تحويل بنكى- عن مستخلص رقم 6 مشروع الابراج الصينية العالمين', 'import', 'المبيعات و التحصيلات لشهر مايو 2026.xlsx', 'row-8', 'excel:2026-05-01:2026-05-10:2506:472600.21', 'posted')
ON CONFLICT (dedupe_key) DO NOTHING;

INSERT INTO public.collection_transactions (project_code, project_name, client, collection_date, collection_month, amount, currency, notes, source_type, source_file_name, source_row_key, dedupe_key, status)
VALUES ('PZ-007', '2421- 24-21 - الساحل - HAC -حمام سباحة 20 - R8', 'اتش ايه للانشاءات', '2026-05-11', '2026-05-01', 1000000.00, 'EGP', 'تحويل بنكى-عن مستخلص رقم 10 مشروع r8 hac', 'import', 'المبيعات و التحصيلات لشهر مايو 2026.xlsx', 'row-9', 'excel:2026-05-01:2026-05-11:2421:1000000', 'posted')
ON CONFLICT (dedupe_key) DO NOTHING;

INSERT INTO public.collection_transactions (project_code, project_name, client, collection_date, collection_month, amount, currency, notes, source_type, source_file_name, source_row_key, dedupe_key, status)
VALUES ('PZ-025', '1078-معالجة حمام سباحة - الهضبة - المشارق - اكتوبر - 1078', 'مشارق للاستثمار العقارى', '2026-05-11', '2026-05-01', 80207.63, 'EGP', 'تحويل بنكى-عن مطالبة رقم 3 مشروع معالجة مشارق الهضبة', 'import', 'المبيعات و التحصيلات لشهر مايو 2026.xlsx', 'row-10', 'excel:2026-05-01:2026-05-11:1078:80207.63', 'posted')
ON CONFLICT (dedupe_key) DO NOTHING;

INSERT INTO public.collection_transactions (project_code, project_name, client, collection_date, collection_month, amount, currency, notes, source_type, source_file_name, source_row_key, dedupe_key, status)
VALUES ('PZ-030', '2119-21-19 - فيلا محمد عبد المنعم - بالم هيلز - شركة اون تراك', 'بالم هيلز اون تراك محمد عبدالمنعم', '2026-05-13', '2026-05-01', 5000.00, 'EGP', 'تحويل بنكى - من تحت حساب مستخلص ختامى مشروع فيلا اون تراك محمد عبدالمنعم', 'import', 'المبيعات و التحصيلات لشهر مايو 2026.xlsx', 'row-11', 'excel:2026-05-01:2026-05-13:2119:5000', 'posted')
ON CONFLICT (dedupe_key) DO NOTHING;

INSERT INTO public.collection_transactions (project_code, project_name, client, collection_date, collection_month, amount, currency, notes, source_type, source_file_name, source_row_key, dedupe_key, status)
VALUES ('PZ-030', '2119-21-19 - فيلا محمد عبد المنعم - بالم هيلز - شركة اون تراك', 'بالم هيلز اون تراك محمد عبدالمنعم', '2026-05-13', '2026-05-01', 45000.00, 'EGP', 'تحويل بنكى - من تحت حساب مستخلص ختامى مشروع فيلا اون تراك محمد عبدالمنعم', 'import', 'المبيعات و التحصيلات لشهر مايو 2026.xlsx', 'row-12', 'excel:2026-05-01:2026-05-13:2119:45000', 'posted')
ON CONFLICT (dedupe_key) DO NOTHING;

INSERT INTO public.collection_transactions (project_code, project_name, client, collection_date, collection_month, amount, currency, notes, source_type, source_file_name, source_row_key, dedupe_key, status)
VALUES ('PZ-030', '2119-21-19 - فيلا محمد عبد المنعم - بالم هيلز - شركة اون تراك', 'بالم هيلز اون تراك محمد عبدالمنعم', '2026-05-13', '2026-05-01', 50000.00, 'EGP', 'تحويل بنكى - من تحت حساب مستخلص ختامى مشروع فيلا اون تراك محمد عبدالمنعم', 'import', 'المبيعات و التحصيلات لشهر مايو 2026.xlsx', 'row-13', 'excel:2026-05-01:2026-05-13:2119:50000', 'posted')
ON CONFLICT (dedupe_key) DO NOTHING;

INSERT INTO public.collection_transactions (project_code, project_name, client, collection_date, collection_month, amount, currency, notes, source_type, source_file_name, source_row_key, dedupe_key, status)
VALUES ('PZ-034', '1079-توريدات لاينر سول - أمر شراء 78 - إعمار- الساحل - 1079', 'البرو نورث كوست لادارة الممتلكات العقارية', '2026-05-14', '2026-05-01', 6340857.30, 'EGP', 'تحويل بنكى - من اعمار عن مطالبة رقم 2 عن امر شراء رقم 78 عن توريدات سول لاينر', 'import', 'المبيعات و التحصيلات لشهر مايو 2026.xlsx', 'row-14', 'excel:2026-05-01:2026-05-14:1079:6340857.3', 'posted')
ON CONFLICT (dedupe_key) DO NOTHING;

INSERT INTO public.collection_transactions (project_code, project_name, client, collection_date, collection_month, amount, currency, notes, source_type, source_file_name, source_row_key, dedupe_key, status)
VALUES ('PZ-002', '2402-24-02 - soul Parcel 3&4 - الساحل - Orascom', 'اوراسكوم للانشاءات', '2026-05-18', '2026-05-01', 3671444.82, 'EGP', 'حافظة استلام اوراق القبض رقم 54 بتاريخ 18-05-2026 شيك من شركة اوراسكوم عن مستخلص رقم 7 عن مشروع سول بشيك رقم 13000539541 من بنك قناة السويس', 'import', 'المبيعات و التحصيلات لشهر مايو 2026.xlsx', 'row-16', 'excel:2026-05-01:2026-05-18:2402:3671444.82', 'posted')
ON CONFLICT (dedupe_key) DO NOTHING;

INSERT INTO public.collection_transactions (project_code, project_name, client, collection_date, collection_month, amount, currency, notes, source_type, source_file_name, source_row_key, dedupe_key, status)
VALUES ('PZ-021', '2414-24-14 - اي سيتي - حمامات سباحة - كيرف - الاوسطي', 'دار المعمار للمقاولات والمشروعات', '2026-05-19', '2026-05-01', 290775.12, 'EGP', 'حافظة استلام اوراق القبض رقم 55 بتاريخ 19-05-2026 شيك من دار المعمار عن مستخلص رقم 9 مشروع ICITY من بنك EG BANK بشيك رقم 4600069679', 'import', 'المبيعات و التحصيلات لشهر مايو 2026.xlsx', 'row-17', 'excel:2026-05-01:2026-05-19:2414:290775.12', 'posted')
ON CONFLICT (dedupe_key) DO NOTHING;

INSERT INTO public.collection_transactions (project_code, project_name, client, collection_date, collection_month, amount, currency, notes, source_type, source_file_name, source_row_key, dedupe_key, status)
VALUES ('PZ-028', '2333-23-33 - Aqua tonic - المنصورة 7 - شركة انسباير', 'انسباير للبناء والتصميمات', '2026-05-19', '2026-05-01', 750000.00, 'EGP', 'حافظة استلام اوراق القبض رقم 60 بتاريخ 19-05-2026 شيك من شركة انسباير عن مشروع المنصورة 7 عن مستخلص رقم 5 بشيك رقم 13817001231101 من البنك الاهلي المصري و تم ايداعه في البنك الاهلي المصري 1016', 'import', 'المبيعات و التحصيلات لشهر مايو 2026.xlsx', 'row-18', 'excel:2026-05-01:2026-05-19:2333:750000', 'posted')
ON CONFLICT (dedupe_key) DO NOTHING;

INSERT INTO public.collection_transactions (project_code, project_name, client, collection_date, collection_month, amount, currency, notes, source_type, source_file_name, source_row_key, dedupe_key, status)
VALUES ('PZ-029', '2269-22-69 - كابيتال واي - شركة تايم ميكس', 'تايم ميكس لانشاء وادارة المولات التجارية', '2026-05-20', '2026-05-01', 72075.00, 'EGP', 'حافظة استلام اوراق القبض رقم 58 بتاريخ 20-05-2026 شيك من شركة تايم ميكس عن مشروع كابيتال واي بشيك رقم 109800080778 من بنك القاهرة', 'import', 'المبيعات و التحصيلات لشهر مايو 2026.xlsx', 'row-19', 'excel:2026-05-01:2026-05-20:2269:72075', 'posted')
ON CONFLICT (dedupe_key) DO NOTHING;

INSERT INTO public.collection_transactions (project_code, project_name, client, collection_date, collection_month, amount, currency, notes, source_type, source_file_name, source_row_key, dedupe_key, status)
VALUES ('PZ-026', '2309-23-09 - فيلا هايد بارك - شركة مدكور', 'مصطفى مدكور وشريكيه', '2026-05-21', '2026-05-01', 212753.00, 'EGP', 'تحويل بنكي - عن مشروع هايد بارك عن مستخلص ختامي', 'import', 'المبيعات و التحصيلات لشهر مايو 2026.xlsx', 'row-21', 'excel:2026-05-01:2026-05-21:2309:212753', 'posted')
ON CONFLICT (dedupe_key) DO NOTHING;

INSERT INTO public.collection_transactions (project_code, project_name, client, collection_date, collection_month, amount, currency, notes, source_type, source_file_name, source_row_key, dedupe_key, status)
VALUES ('PZ-023', '2325-23-25 - بلوم فيلدز 17 نافورة - المستقبل سيتي - تطوير مصر', 'تطوير مصر للاستثمار السياحى واستصلاح الاراضى', '2026-05-21', '2026-05-01', 223716.06, 'EGP', 'حافظة استلام اوراق القبض رقم 59 بتاريخ 21-05-2026 شيك من شركة تطوير مصر عن مشروع بلوم فيلدز 17 نافورة بشيك رقم 947932974 من البنك العربي الافريقي', 'import', 'المبيعات و التحصيلات لشهر مايو 2026.xlsx', 'row-22', 'excel:2026-05-01:2026-05-21:2325:223716.06', 'posted')
ON CONFLICT (dedupe_key) DO NOTHING;

INSERT INTO public.collection_transactions (project_code, project_name, client, collection_date, collection_month, amount, currency, notes, source_type, source_file_name, source_row_key, dedupe_key, status)
VALUES ('PZ-001', '2401-24-01 - soul Parcel 1&2 - الساحل - HAC', 'اتش ايه للانشاءات', '2026-05-21', '2026-05-01', 3000000.00, 'EGP', 'حافظة استلام اوراق القبض رقم 61 بتاريخ 21-05-2026 شيك من شركة حسن علام عن مستخلص رقم 7 عن مشروع سول بشيك رقم 73021560 من البنك الاهلي القطري', 'import', 'المبيعات و التحصيلات لشهر مايو 2026.xlsx', 'row-23', 'excel:2026-05-01:2026-05-21:2401:3000000', 'posted')
ON CONFLICT (dedupe_key) DO NOTHING;

INSERT INTO public.collection_transactions (project_code, project_name, client, collection_date, collection_month, amount, currency, notes, source_type, source_file_name, source_row_key, dedupe_key, status)
VALUES ('PZ-031', '2406-24-06 - City Gate 6 fountains - New cairo - CCC', 'اتحاد المقاولين للاعمال الكهروميكانيكاCCCE', '2026-05-19', '2026-05-01', 423385.41, 'EGP', 'حافظة استلام اوراق القبض رقم 56 بتاريخ 19-05-2026 قيمة رد تامين ابتدائى عن مشروع city gate من بنك E BANK بشيك رقم48923222', 'import', 'المبيعات و التحصيلات لشهر مايو 2026.xlsx', 'row-25', 'excel:2026-05-01:2026-05-19:2406:423385.41', 'posted')
ON CONFLICT (dedupe_key) DO NOTHING;

INSERT INTO public.collection_transactions (project_code, project_name, client, collection_date, collection_month, amount, currency, notes, source_type, source_file_name, source_row_key, dedupe_key, status)
VALUES ('PZ-031', '2406-24-06 - City Gate 6 fountains - New cairo - CCC', 'اتحاد المقاولين للاعمال الكهروميكانيكاCCCE', '2026-05-19', '2026-05-01', 213307.29, 'EGP', 'حافظة استلام اوراق القبض رقم 57 بتاريخ 19-05-2026 قيمة رد جزء تامين نهائى عن مشروع city gate من بنك E BANK بشيك رقم48923222', 'import', 'المبيعات و التحصيلات لشهر مايو 2026.xlsx', 'row-26', 'excel:2026-05-01:2026-05-19:2406:213307.29', 'posted')
ON CONFLICT (dedupe_key) DO NOTHING;

-- File: تحصيلات و فواتير شهر 1 سنة 2026.xlsx (sheet: Sheet1)
INSERT INTO public.collection_transactions (project_code, project_name, client, collection_date, collection_month, amount, currency, notes, source_type, source_file_name, source_row_key, dedupe_key, status)
VALUES ('PZ-007', '2421- 24-21 - الساحل - HAC -حمام سباحة 20 - R8', 'اتش ايه للانشاءات', '2026-01-18', '2026-01-01', 487524.59, 'EGP', 'تحويل بنكى - عن جزء مستخلص رقم 8 مشروع R8 حسن علام', 'import', 'تحصيلات و فواتير شهر 1 سنة 2026.xlsx', 'row-3', 'excel:2026-01-01:2026-01-18:2421:487524.59', 'posted')
ON CONFLICT (dedupe_key) DO NOTHING;

INSERT INTO public.collection_transactions (project_code, project_name, client, collection_date, collection_month, amount, currency, notes, source_type, source_file_name, source_row_key, dedupe_key, status)
VALUES ('PZ-025', '1078-معالجة حمام سباحة - الهضبة - المشارق - اكتوبر - 1078', 'مشارق للاستثمار العقارى', '2026-01-18', '2026-01-01', 58992.47, 'EGP', 'تحويل عن مطالبة صيانة رقم 1 شركة مشارق عن مشروع الهضبة', 'import', 'تحصيلات و فواتير شهر 1 سنة 2026.xlsx', 'row-4', 'excel:2026-01-01:2026-01-18:1078:58992.47', 'posted')
ON CONFLICT (dedupe_key) DO NOTHING;

INSERT INTO public.collection_transactions (project_code, project_name, client, collection_date, collection_month, amount, currency, notes, source_type, source_file_name, source_row_key, dedupe_key, status)
VALUES ('PZ-004', '2511-رأس الحكمة - عدد 6 حمام سباحة و 2 نافورة - Orascom - الساحل - 11-25', 'اوراسكوم للانشاءات', '2026-01-20', '2026-01-01', 2069332.10, 'EGP', 'حافظة استلام اوراق القبض رقم 1 بتاريخ 20-01-2026 شيك رقم 99707475 عن دفعه من مستخلص رقم 1 مشروع اوراسكوم راس الحكمه من بنك مصر وتم ايداعه فى بنك الامارات دبى', 'import', 'تحصيلات و فواتير شهر 1 سنة 2026.xlsx', 'row-5', 'excel:2026-01-01:2026-01-20:2511:2069332.1', 'posted')
ON CONFLICT (dedupe_key) DO NOTHING;

INSERT INTO public.collection_transactions (project_code, project_name, client, collection_date, collection_month, amount, currency, notes, source_type, source_file_name, source_row_key, dedupe_key, status)
VALUES ('PZ-007', '2421- 24-21 - الساحل - HAC -حمام سباحة 20 - R8', 'اتش ايه للانشاءات', '2026-01-22', '2026-01-01', 1695314.24, 'EGP', 'تحويل بنكى - عن مستخلص رقم 8 و 9 عن مشروع R8 حسن علام', 'import', 'تحصيلات و فواتير شهر 1 سنة 2026.xlsx', 'row-6', 'excel:2026-01-01:2026-01-22:2421:1695314.24', 'posted')
ON CONFLICT (dedupe_key) DO NOTHING;

INSERT INTO public.collection_transactions (project_code, project_name, client, collection_date, collection_month, amount, currency, notes, source_type, source_file_name, source_row_key, dedupe_key, status)
VALUES ('PZ-021', '2414-24-14 - اي سيتي - حمامات سباحة - كيرف - الاوسطي', 'دار المعمار للمقاولات والمشروعات', '2026-01-25', '2026-01-01', 3239961.66, 'EGP', 'حافظة استلام اوراق القبض رقم 2 بتاريخ 25-01-2026 شيك رقم 4600067206من EG Bank وتم ايداعه فى البنك الاهلى الصرى 16 عن مستخلص رقم 7 مشروع أى ستى', 'import', 'تحصيلات و فواتير شهر 1 سنة 2026.xlsx', 'row-7', 'excel:2026-01-01:2026-01-25:2414:3239961.66', 'posted')
ON CONFLICT (dedupe_key) DO NOTHING;

INSERT INTO public.collection_transactions (project_code, project_name, client, collection_date, collection_month, amount, currency, notes, source_type, source_file_name, source_row_key, dedupe_key, status)
VALUES ('PZ-025', '2415-24-15 - الهضبة - حمام سباحة - مشارق - اكتوبر', 'مشارق للاستثمار العقارى', '2026-01-26', '2026-01-01', 200000.00, 'EGP', 'تحويل بنكى - عن مستخلص رقم 7 مشروع مشارق الهضبة', 'import', 'تحصيلات و فواتير شهر 1 سنة 2026.xlsx', 'row-8', 'excel:2026-01-01:2026-01-26:2415:200000', 'posted')
ON CONFLICT (dedupe_key) DO NOTHING;

INSERT INTO public.collection_transactions (project_code, project_name, client, collection_date, collection_month, amount, currency, notes, source_type, source_file_name, source_row_key, dedupe_key, status)
VALUES ('PZ-001', '2401-24-01 - soul Parcel 1&2 - الساحل - HAC', 'اتش ايه للانشاءات', '2026-01-27', '2026-01-01', 1248625.54, 'EGP', 'حافظة استلام اوراق القبض رقم 7 بتاريخ 27-01-2026 شيك من شركة اتش ايه للانشاءات عن مستخلص رقم 5 مشروع سول حسم علام من بنك QNB بشيك رقم 72587887 و تم ايداعة فى البنك الكويتى الوطنى 10310', 'import', 'تحصيلات و فواتير شهر 1 سنة 2026.xlsx', 'row-10', 'excel:2026-01-01:2026-01-27:2401:1248625.54', 'posted')
ON CONFLICT (dedupe_key) DO NOTHING;

INSERT INTO public.collection_transactions (project_code, project_name, client, collection_date, collection_month, amount, currency, notes, source_type, source_file_name, source_row_key, dedupe_key, status)
VALUES ('PZ-001', '2401-24-01 - soul Parcel 1&2 - الساحل - HAC', 'اتش ايه للانشاءات', '2026-01-27', '2026-01-01', 786023.00, 'EGP', 'حافظة استلام اوراق القبض رقم 9 بتاريخ 27-01-2026 شيك من شركة اتش ايه للانشاءات عن مستخلص رقم 5 و 6 مشروع سول حسم علام من بنك QNB بشيك رقم 72587886 و تم ايداعة فى البنك الكويتى الوطنى 10310', 'import', 'تحصيلات و فواتير شهر 1 سنة 2026.xlsx', 'row-11', 'excel:2026-01-01:2026-01-27:2401:786023', 'posted')
ON CONFLICT (dedupe_key) DO NOTHING;

INSERT INTO public.collection_transactions (project_code, project_name, client, collection_date, collection_month, amount, currency, notes, source_type, source_file_name, source_row_key, dedupe_key, status)
VALUES ('PZ-025', '1078-معالجة حمام سباحة - الهضبة - المشارق - اكتوبر - 1078', 'مشارق للاستثمار العقارى', '2026-01-28', '2026-01-01', 129484.09, 'EGP', 'دفعة من تحت حساب معالجة الهضبة مشارق', 'import', 'تحصيلات و فواتير شهر 1 سنة 2026.xlsx', 'row-12', 'excel:2026-01-01:2026-01-28:1078:129484.09', 'posted')
ON CONFLICT (dedupe_key) DO NOTHING;

INSERT INTO public.collection_transactions (project_code, project_name, client, collection_date, collection_month, amount, currency, notes, source_type, source_file_name, source_row_key, dedupe_key, status)
VALUES ('PZ-030', '2119-21-19 - فيلا محمد عبد المنعم - بالم هيلز - شركة اون تراك', 'بالم هيلز اون تراك محمد عبدالمنعم', '2026-01-28', '2026-01-01', 100000.00, 'EGP', 'دفعه من تحت حساب مستخلص ختامى فيلا محمد عبد المنعم', 'import', 'تحصيلات و فواتير شهر 1 سنة 2026.xlsx', 'row-13', 'excel:2026-01-01:2026-01-28:2119:100000', 'posted')
ON CONFLICT (dedupe_key) DO NOTHING;

INSERT INTO public.collection_transactions (project_code, project_name, client, collection_date, collection_month, amount, currency, notes, source_type, source_file_name, source_row_key, dedupe_key, status)
VALUES ('PZ-002', '2402-24-02 - soul Parcel 3&4 - الساحل - Orascom', 'اوراسكوم للانشاءات', '2026-01-11', '2026-01-01', 10437613.21, 'EGP', 'فاتورة رقم 1899 عن مستخلص رقم 7 مقاول باطن عن اعمال بحيرات مشروع سول اوراسكوم', 'import', 'تحصيلات و فواتير شهر 1 سنة 2026.xlsx', 'row-18', 'excel:2026-01-01:2026-01-11:2402:10437613.21', 'posted')
ON CONFLICT (dedupe_key) DO NOTHING;

INSERT INTO public.collection_transactions (project_code, project_name, client, collection_date, collection_month, amount, currency, notes, source_type, source_file_name, source_row_key, dedupe_key, status)
VALUES ('PZ-025', '1078-معالجة حمام سباحة - الهضبة - المشارق - اكتوبر - 1078', 'مشارق للاستثمار العقاري', '2026-01-12', '2026-01-01', 80921.05, 'EGP', 'فاتورة رقم 1901 عن مطالبه رقم 2 عن  اعمال  صيانة حمام سباحة بمشروع الهضبة  عن الفترة من 01/12/2025 الى 31/12/2025', 'import', 'تحصيلات و فواتير شهر 1 سنة 2026.xlsx', 'row-19', 'excel:2026-01-01:2026-01-12:1078:80921.05', 'posted')
ON CONFLICT (dedupe_key) DO NOTHING;

INSERT INTO public.collection_transactions (project_code, project_name, client, collection_date, collection_month, amount, currency, notes, source_type, source_file_name, source_row_key, dedupe_key, status)
VALUES ('PZ-006', 'بحيرات العلمين - أبراج الداون تاون - الشركة الصينية -الساحل - 06-25', 'الشركة الصينية العامة للهندسة المعمارية بمصر', '2026-01-18', '2026-01-01', 6598930.25, 'EGP', 'فاتورة رقم  1903 عن مستخلص رقم 4 عن  اعمال مقاولة من الباطن مشروع الابراج الصينية العالمين', 'import', 'تحصيلات و فواتير شهر 1 سنة 2026.xlsx', 'row-20', 'excel:2026-01-01:2026-01-18:name:6598930.25', 'posted')
ON CONFLICT (dedupe_key) DO NOTHING;

INSERT INTO public.collection_transactions (project_code, project_name, client, collection_date, collection_month, amount, currency, notes, source_type, source_file_name, source_row_key, dedupe_key, status)
VALUES ('PZ-001', '24-01 - soul Parcel 1&2 - الساحل - HAC', 'اتش ايه للانشاءات', '2026-01-18', '2026-01-01', 3168916.50, 'EGP', 'فاتورة رقم 1904 عن مستخلص رقم 6 عن اعمال مقاولة من الباطن لتنفيذ اعمال تصميم و توريد و تركيب و اختبار و ضمان و تسليم اعمال  مشروع منتجع سول الساحل  اتش ايه', 'import', 'تحصيلات و فواتير شهر 1 سنة 2026.xlsx', 'row-21', 'excel:2026-01-01:2026-01-18:name:3168916.5', 'posted')
ON CONFLICT (dedupe_key) DO NOTHING;

INSERT INTO public.collection_transactions (project_code, project_name, client, collection_date, collection_month, amount, currency, notes, source_type, source_file_name, source_row_key, dedupe_key, status)
VALUES ('PZ-025', '2415-24-15 - الهضبة - حمام سباحة - مشارق - اكتوبر', 'مشارق للاستثمار العقاري', '2026-01-18', '2026-01-01', 567098.27, 'EGP', 'فاتورة رقم 1906 عن مستخلص رقم 7 عن تصميم و تنفيذ حمام سباحة 1 بالمرحلة الاولى مشروع الهضبة', 'import', 'تحصيلات و فواتير شهر 1 سنة 2026.xlsx', 'row-23', 'excel:2026-01-01:2026-01-18:2415:567098.27', 'posted')
ON CONFLICT (dedupe_key) DO NOTHING;

INSERT INTO public.collection_transactions (project_code, project_name, client, collection_date, collection_month, amount, currency, notes, source_type, source_file_name, source_row_key, dedupe_key, status)
VALUES ('PZ-004', 'رأس الحكمة - عدد 6 حمام سباحة و 2 نافورة - Orascom - الساحل - 11-25', 'اوراسكوم للانشاءات', '2026-01-19', '2026-01-01', 36938031.10, 'EGP', 'فاتورة رقم 1907 عن مستخلص رقم  1 مقاول باطن  عن اعمال الكتروميكانيكيا  للمنشات المائية مشروع راس الحكمة', 'import', 'تحصيلات و فواتير شهر 1 سنة 2026.xlsx', 'row-24', 'excel:2026-01-01:2026-01-19:name:36938031.1', 'posted')
ON CONFLICT (dedupe_key) DO NOTHING;

INSERT INTO public.collection_transactions (project_code, project_name, client, collection_date, collection_month, amount, currency, notes, source_type, source_file_name, source_row_key, dedupe_key, status)
VALUES ('PZ-002', '2402-24-02 - soul Parcel 3&4 - الساحل - Orascom', 'اوراسكوم للانشاءات', '2026-01-26', '2026-01-01', 20515409.07, 'EGP', 'فاتورة رقم 1908 عن مستخلص رقم 8 مقاول باطن عن اعمال بحيرات مشروع سول اوراسكوم', 'import', 'تحصيلات و فواتير شهر 1 سنة 2026.xlsx', 'row-25', 'excel:2026-01-01:2026-01-26:2402:20515409.07', 'posted')
ON CONFLICT (dedupe_key) DO NOTHING;

INSERT INTO public.collection_transactions (project_code, project_name, client, collection_date, collection_month, amount, currency, notes, source_type, source_file_name, source_row_key, dedupe_key, status)
VALUES ('PZ-015', '24-13 - ساراي كافانا - بحيرة - مدينة مصر - طريق السويس', 'شركة مدينة مصر للاسكان و التعمير', '2026-01-26', '2026-01-01', 7485716.97, 'EGP', 'فاتورة رقم 1909 عن مستخلص رقم 5 مشروع تنفيذ اعمال البحيرة الصناعية اللاجون مشروع ساراى كافانا', 'import', 'تحصيلات و فواتير شهر 1 سنة 2026.xlsx', 'row-26', 'excel:2026-01-01:2026-01-26:name:7485716.97', 'posted')
ON CONFLICT (dedupe_key) DO NOTHING;

INSERT INTO public.collection_transactions (project_code, project_name, client, collection_date, collection_month, amount, currency, notes, source_type, source_file_name, source_row_key, dedupe_key, status)
VALUES ('PZ-029', '22-69 - كابيتال واي - شركة تايم ميكس', 'تايم ميكس لانشاء وادارة المولات التجارية', '2026-01-27', '2026-01-01', 813088.00, 'EGP', 'فاتورة رقم 1910 عن مستخلص رقم 5 اعمال مقاولة لحمامات سباحة مشروع كابيتال واى شركة تايم ميكس', 'import', 'تحصيلات و فواتير شهر 1 سنة 2026.xlsx', 'row-27', 'excel:2026-01-01:2026-01-27:name:813088', 'posted')
ON CONFLICT (dedupe_key) DO NOTHING;

INSERT INTO public.collection_transactions (project_code, project_name, client, collection_date, collection_month, amount, currency, notes, source_type, source_file_name, source_row_key, dedupe_key, status)
VALUES ('PZ-019', 'سوان ليك - تجديد بحيرات - حسن علام - أكتوبر - 04-25', 'سيتى للتنمية السياحية والعقارية', '2026-01-27', '2026-01-01', 5179755.08, 'EGP', 'فاتورة رقم 1911عن مستخلص رقم 1&2 عن اعمال الكترومكاننكية للبحيرات مشروع سوان ليك اكتوبر المرحلى الاولى', 'import', 'تحصيلات و فواتير شهر 1 سنة 2026.xlsx', 'row-28', 'excel:2026-01-01:2026-01-27:name:5179755.08', 'posted')
ON CONFLICT (dedupe_key) DO NOTHING;

INSERT INTO public.collection_transactions (project_code, project_name, client, collection_date, collection_month, amount, currency, notes, source_type, source_file_name, source_row_key, dedupe_key, status)
VALUES ('PZ-033', 'توريدات سول - أمر شراء 343 - إعمار- الساحل - 1070', 'البرو نورث كوست لادارة الممتلكات العقارية', '2026-01-28', '2026-01-01', 53550934.01, 'EGP', 'فاتورة رقم 1912 عن توريدات معدات حمام سباحة و انظمة الترشيح و لوحات التشغيل و التحكم و الاكسسوارات لانظمة حمامات السباحة بمشروع سول المرحلة الاولى بامر شراء 343', 'import', 'تحصيلات و فواتير شهر 1 سنة 2026.xlsx', 'row-29', 'excel:2026-01-01:2026-01-28:name:53550934.01', 'posted')
ON CONFLICT (dedupe_key) DO NOTHING;

-- File: فواتير وو تحصيلات شهر 3 سنة 2026.xlsx (sheet: تحصيلات)
INSERT INTO public.collection_transactions (project_code, project_name, client, collection_date, collection_month, amount, currency, notes, source_type, source_file_name, source_row_key, dedupe_key, status)
VALUES ('PZ-003', '2403-24-03 - soul Phase 1C - الساحل - Redcon', 'ريدكون للتعمير', '2026-03-01', '2026-03-01', 1641683.02, 'EGP', 'حافظة استلام اوراق القبض رقم 19 بتاريخ 01-03-2026 شيك من شركة ريدكون عن دفعة عن مستخلص رقم 4 مشروع سول ريدكون بشيك من بنك قناه السويس بشيك رقم 7000328470 و تم ايداعة فى ابو ظبى', 'import', 'فواتير وو تحصيلات شهر 3 سنة 2026.xlsx', 'row-1', 'excel:2026-03-01:2026-03-01:2403:1641683.02', 'posted')
ON CONFLICT (dedupe_key) DO NOTHING;

INSERT INTO public.collection_transactions (project_code, project_name, client, collection_date, collection_month, amount, currency, notes, source_type, source_file_name, source_row_key, dedupe_key, status)
VALUES ('PZ-005', '2419-رملة - 41 حمام سباحة - مراكز العقارية - الساحل - 19-24', 'شركة ايتاب للاستثمارات العقارية والسياحية', '2026-03-03', '2026-03-01', 719999.78, 'EGP', 'حافظة استلام اوراق القبض رقم 20 بتاريخ 03-03-2026 استلام شيك رقم 000549148350 عن مستخلص رقم 4 مشروع 41 حمام سباحه رمله شركه ايتاب وتم ايداعه فى بنك سايب', 'import', 'فواتير وو تحصيلات شهر 3 سنة 2026.xlsx', 'row-2', 'excel:2026-03-01:2026-03-03:2419:719999.78', 'posted')
ON CONFLICT (dedupe_key) DO NOTHING;

INSERT INTO public.collection_transactions (project_code, project_name, client, collection_date, collection_month, amount, currency, notes, source_type, source_file_name, source_row_key, dedupe_key, status)
VALUES ('PZ-006', '2506-بحيرات العلمين - أبراج الداون تاون - الشركة الصينية -الساحل - 06-25', 'الشركة الصينية العامة للهندسة المعمارية بمصر', '2026-03-05', '2026-03-01', 3731228.20, 'EGP', 'تحويل بنكى- دفعة عن مستخلص رقم 5 مشروع الابراج الصينية العالمين', 'import', 'فواتير وو تحصيلات شهر 3 سنة 2026.xlsx', 'row-4', 'excel:2026-03-01:2026-03-05:2506:3731228.2', 'posted')
ON CONFLICT (dedupe_key) DO NOTHING;

INSERT INTO public.collection_transactions (project_code, project_name, client, collection_date, collection_month, amount, currency, notes, source_type, source_file_name, source_row_key, dedupe_key, status)
VALUES ('PZ-001', '2401-24-01 - soul Parcel 1&2 - الساحل - HAC', 'اتش ايه للانشاءات', '2026-03-10', '2026-03-01', 695642.12, 'EGP', 'حافظة استلام اوراق القبض رقم 24 بتاريخ 10-03-2026 شيك رقم 73021132 من اتش ايه للانشاءات عن مشروع سول عن مستخلص رقم 6 من بنك QNB وتم ايداعه فى بنك الكويت الوطنى', 'import', 'فواتير وو تحصيلات شهر 3 سنة 2026.xlsx', 'row-6', 'excel:2026-03-01:2026-03-10:2401:695642.12', 'posted')
ON CONFLICT (dedupe_key) DO NOTHING;

INSERT INTO public.collection_transactions (project_code, project_name, client, collection_date, collection_month, amount, currency, notes, source_type, source_file_name, source_row_key, dedupe_key, status)
VALUES ('PZ-001', '2401-24-01 - soul Parcel 1&2 - الساحل - HAC', 'اتش ايه للانشاءات', '2026-03-10', '2026-03-01', 1300000.00, 'EGP', 'حافظة استلام اوراق القبض رقم 25 بتاريخ 10-03-2026 شيك من العميل اتش ايه عن مشروع سول عن مستخلص رقم 5 بشيك رقم 73021133 من البنك qnb و تم ايداعه في بنك nbk', 'import', 'فواتير وو تحصيلات شهر 3 سنة 2026.xlsx', 'row-7', 'excel:2026-03-01:2026-03-10:2401:1300000', 'posted')
ON CONFLICT (dedupe_key) DO NOTHING;

INSERT INTO public.collection_transactions (project_code, project_name, client, collection_date, collection_month, amount, currency, notes, source_type, source_file_name, source_row_key, dedupe_key, status)
VALUES ('PZ-028', '2333-23-33 - Aqua tonic - المنصورة 7 - شركة انسباير', 'انسباير للبناء والتصميمات', '2026-03-11', '2026-03-01', 500000.00, 'EGP', 'حافظة استلام اوراق القبض رقم 21 بتاريخ 11-03-2026 شيك من انسباير عن مستخلص رقم 3 عن مشروع المنصورة 7 من البنك الاهلي بشيك رقم 13817001230970', 'import', 'فواتير وو تحصيلات شهر 3 سنة 2026.xlsx', 'row-8', 'excel:2026-03-01:2026-03-11:2333:500000', 'posted')
ON CONFLICT (dedupe_key) DO NOTHING;

INSERT INTO public.collection_transactions (project_code, project_name, client, collection_date, collection_month, amount, currency, notes, source_type, source_file_name, source_row_key, dedupe_key, status)
VALUES ('PZ-002', '2402-24-02 - soul Parcel 3&4 - الساحل - Orascom', 'اوراسكوم للانشاءات', '2026-03-11', '2026-03-01', 7500000.00, 'EGP', 'حافظة استلام اوراق القبض رقم 22 بتاريخ 11-03-2026 شيك من العميل اوراسكوم عن مشروع سول دفعة من تحت حساب مستخلص رقم 8 بشيك رقم 000532201917 من البنك التجاري الدولي و تم ايداعه في بنك الاهلي المصري 1011', 'import', 'فواتير وو تحصيلات شهر 3 سنة 2026.xlsx', 'row-9', 'excel:2026-03-01:2026-03-11:2402:7500000', 'posted')
ON CONFLICT (dedupe_key) DO NOTHING;

INSERT INTO public.collection_transactions (project_code, project_name, client, collection_date, collection_month, amount, currency, notes, source_type, source_file_name, source_row_key, dedupe_key, status)
VALUES ('PZ-008', '2422-R8 - حمامات سباحة 10 - أوراسكوم - الساحل - 24-22', 'اوراسكوم للانشاءات', '2026-03-11', '2026-03-01', 1000000.00, 'EGP', 'حافظة استلام اوراق القبض رقم 23 بتاريخ 11-03-2026 شيك رقم 000532201824 من اوراسكوم عن مشروع R8 دفعه من مستخلص رقم 5 من بنك CIB وتم ايداعه فى بنك Saib 460', 'import', 'فواتير وو تحصيلات شهر 3 سنة 2026.xlsx', 'row-10', 'excel:2026-03-01:2026-03-11:2422:1000000', 'posted')
ON CONFLICT (dedupe_key) DO NOTHING;

INSERT INTO public.collection_transactions (project_code, project_name, client, collection_date, collection_month, amount, currency, notes, source_type, source_file_name, source_row_key, dedupe_key, status)
VALUES ('PZ-030', '2119-21-19 - فيلا محمد عبد المنعم - بالم هيلز - شركة اون تراك', 'بالم هيلز اون تراك محمد عبدالمنعم', '2026-03-12', '2026-03-01', 158350.00, 'EGP', 'تحويل بنكى - من تحت حساب مستخلص ختامى مشروع فيلا اون تراك محمد عبدالمنعم', 'import', 'فواتير وو تحصيلات شهر 3 سنة 2026.xlsx', 'row-11', 'excel:2026-03-01:2026-03-12:2119:158350', 'posted')
ON CONFLICT (dedupe_key) DO NOTHING;

INSERT INTO public.collection_transactions (project_code, project_name, client, collection_date, collection_month, amount, currency, notes, source_type, source_file_name, source_row_key, dedupe_key, status)
VALUES ('PZ-007', '2421- 24-21 - الساحل - HAC -حمام سباحة 20 - R8', 'اتش ايه للانشاءات', '2026-03-15', '2026-03-01', 1840114.50, 'EGP', 'تحويل بنكى- دفعة عن مستخلص رقم 10 عن مشروع R8 حسن علام', 'import', 'فواتير وو تحصيلات شهر 3 سنة 2026.xlsx', 'row-12', 'excel:2026-03-01:2026-03-15:2421:1840114.5', 'posted')
ON CONFLICT (dedupe_key) DO NOTHING;

INSERT INTO public.collection_transactions (project_code, project_name, client, collection_date, collection_month, amount, currency, notes, source_type, source_file_name, source_row_key, dedupe_key, status)
VALUES ('PZ-013', '2412-24-12 - سيلفر ساند - 8 حمامات سباحة - اوراسكوم - الساحل', 'اوراسكوم للانشاءات', '2026-03-16', '2026-03-01', 2073316.12, 'EGP', 'حافظة استلام اوراق القبض رقم 26 بتاريخ 16-03-2026 شيك من اوراسكوم عن مستخلص رقم 5 عن مشروع سيلفر ساند من بنك مصر بشيك رقم 100004630766', 'import', 'فواتير وو تحصيلات شهر 3 سنة 2026.xlsx', 'row-13', 'excel:2026-03-01:2026-03-16:2412:2073316.12', 'posted')
ON CONFLICT (dedupe_key) DO NOTHING;

INSERT INTO public.collection_transactions (project_code, project_name, client, collection_date, collection_month, amount, currency, notes, source_type, source_file_name, source_row_key, dedupe_key, status)
VALUES ('PZ-032', '2131-21-31 - المنصورة 1 - شركة جينيت', 'جينيت لتنسيق الحدائق والخدمات', '2026-03-16', '2026-03-01', 1000000.00, 'EGP', 'حافظة استلام اوراق القبض رقم 27 بتاريخ 16-03-2026 شيك من جينيت عن مستخلص رقم 20 عن مشروع المنصورة 1 من بنك CIB بشيك رقم 550928342', 'import', 'فواتير وو تحصيلات شهر 3 سنة 2026.xlsx', 'row-14', 'excel:2026-03-01:2026-03-16:2131:1000000', 'posted')
ON CONFLICT (dedupe_key) DO NOTHING;

INSERT INTO public.collection_transactions (project_code, project_name, client, collection_date, collection_month, amount, currency, notes, source_type, source_file_name, source_row_key, dedupe_key, status)
VALUES ('PZ-025', '1078-معالجة حمام سباحة - الهضبة - المشارق - اكتوبر - 1078', 'مشارق للاستثمار العقارى', '2026-03-17', '2026-03-01', 160000.00, 'EGP', 'تحويل بنكى - عن مطالبة رقم 2 و 3 عن اعمال صيانة فى مشروع مشارق الهضبة', 'import', 'فواتير وو تحصيلات شهر 3 سنة 2026.xlsx', 'row-15', 'excel:2026-03-01:2026-03-17:1078:160000', 'posted')
ON CONFLICT (dedupe_key) DO NOTHING;

INSERT INTO public.collection_transactions (project_code, project_name, client, collection_date, collection_month, amount, currency, notes, source_type, source_file_name, source_row_key, dedupe_key, status)
VALUES ('PZ-028', '2333-23-33 - Aqua tonic - المنصورة 7 - شركة انسباير', 'انسباير للبناء والتصميمات', '2026-03-17', '2026-03-01', 1000000.00, 'EGP', 'حافظة استلام اوراق القبض رقم 29 بتاريخ 17-03-2026 شيك رقم 13817001231043 من شركه انسباير عن مستخلص رقم 4 مشروع المنصوره 7 وتم ايداعه فى البنك الاهلى المصرى', 'import', 'فواتير وو تحصيلات شهر 3 سنة 2026.xlsx', 'row-16', 'excel:2026-03-01:2026-03-17:2333:1000000', 'posted')
ON CONFLICT (dedupe_key) DO NOTHING;

INSERT INTO public.collection_transactions (project_code, project_name, client, collection_date, collection_month, amount, currency, notes, source_type, source_file_name, source_row_key, dedupe_key, status)
VALUES ('PZ-001', '2401-24-01 - soul Parcel 1&2 - الساحل - HAC', 'اتش ايه للانشاءات', '2026-03-17', '2026-03-01', 4000000.00, 'EGP', 'حافظة استلام اوراق القبض رقم 30 بتاريخ 17-03-2026 شيك رقم 73021245 من اتش ايه للانشاءات حسن علام - دفعه من مستخلص رقم 7 مشروع سول وتم ايداعه فى بنك الكويت الوطنى', 'import', 'فواتير وو تحصيلات شهر 3 سنة 2026.xlsx', 'row-17', 'excel:2026-03-01:2026-03-17:2401:4000000', 'posted')
ON CONFLICT (dedupe_key) DO NOTHING;

INSERT INTO public.collection_transactions (project_code, project_name, client, collection_date, collection_month, amount, currency, notes, source_type, source_file_name, source_row_key, dedupe_key, status)
VALUES ('PZ-006', '2405-رملة - حمام سباحة (Lobby) - مراكز العقارية - الساحل - 05-24', 'شركة ايتاب للاستثمارات العقارية والسياحية', '2026-03-18', '2026-03-01', 2315755.00, 'EGP', 'تحويل بنكى من شركه ايتاب عن دفعه مقدمه مشروع حمام سباحه رمله', 'import', 'فواتير وو تحصيلات شهر 3 سنة 2026.xlsx', 'row-19', 'excel:2026-03-01:2026-03-18:2405:2315755', 'posted')
ON CONFLICT (dedupe_key) DO NOTHING;

INSERT INTO public.collection_transactions (project_code, project_name, client, collection_date, collection_month, amount, currency, notes, source_type, source_file_name, source_row_key, dedupe_key, status)
VALUES ('PZ-033', '1070-توريدات سول - أمر شراء 343 - إعمار- الساحل - 1070', 'البرو نورث كوست لادارة الممتلكات العقارية', '2026-03-18', '2026-03-01', 6863325.08, 'EGP', 'مالبه رقم 2 امر شراء 343 شركه البرو نورث توريات سول تحويل بنكى - دفعه من تحت حساب', 'import', 'فواتير وو تحصيلات شهر 3 سنة 2026.xlsx', 'row-21', 'excel:2026-03-01:2026-03-18:1070:6863325.08', 'posted')
ON CONFLICT (dedupe_key) DO NOTHING;


COMMIT;

-- Total: 81 INSERT statements