import {sqliteTable,text,integer} from 'drizzle-orm/sqlite-core';
export const records=sqliteTable('records',{id:text('id').primaryKey(),kind:text('kind').notNull(),parent:text('parent'),payload:text('payload').notNull()});
export const settings=sqliteTable('settings',{id:text('id').primaryKey(),value:integer('value').notNull()});
export const tableLayouts=sqliteTable('table_layouts',{id:text('id').primaryKey(),payload:text('payload').notNull(),revision:integer('revision').notNull()});
