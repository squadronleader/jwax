import { pathToTableName } from '../../src/schema/naming';

describe('pathToTableName', () => {
  it('should convert simple path', () => {
    expect(pathToTableName(['users'])).toBe('users');
  });

  it('should join multiple segments with underscore', () => {
    expect(pathToTableName(['users', 'address'])).toBe('users_address');
  });

  it('should handle three levels', () => {
    expect(pathToTableName(['data', 'clients', 'orders'])).toBe('data_clients_orders');
  });

  describe('special character sanitization', () => {
    it('should sanitize hyphens', () => {
      expect(pathToTableName(['user-list'])).toBe('user_list');
      expect(pathToTableName(['my-table-name'])).toBe('my_table_name');
    });

    it('should sanitize dots', () => {
      expect(pathToTableName(['client.data'])).toBe('client_data');
      expect(pathToTableName(['api.v2.users'])).toBe('api_v2_users');
    });

    it('should sanitize at symbols', () => {
      expect(pathToTableName(['items@2024'])).toBe('items_2024');
      expect(pathToTableName(['user@domain'])).toBe('user_domain');
    });

    it('should sanitize spaces', () => {
      expect(pathToTableName(['user list'])).toBe('user_list');
      expect(pathToTableName(['my table'])).toBe('my_table');
    });

    it('should sanitize parentheses', () => {
      expect(pathToTableName(['data(old)'])).toBe('data_old');
      expect(pathToTableName(['items(2024)'])).toBe('items_2024');
    });

    it('should sanitize brackets', () => {
      expect(pathToTableName(['data[0]'])).toBe('data_0');
      expect(pathToTableName(['items[archived]'])).toBe('items_archived');
    });

    it('should sanitize slashes', () => {
      expect(pathToTableName(['path/to/data'])).toBe('path_to_data');
      expect(pathToTableName(['api/v1/users'])).toBe('api_v1_users');
    });

    it('should sanitize multiple special characters', () => {
      expect(pathToTableName(['user-list@2024.json'])).toBe('user_list_2024_json');
      expect(pathToTableName(['my@special#data!'])).toBe('my_special_data');
    });

    it('should sanitize unicode and emojis', () => {
      expect(pathToTableName(['données'])).toBe('donn_es');
      expect(pathToTableName(['user🚀data'])).toBe('user_data');
      expect(pathToTableName(['文档'])).toBe('table_data'); // All special chars become empty, fallback to 'table_data'
    });

    it('should sanitize quotes', () => {
      expect(pathToTableName(['"users"'])).toBe('_users'); // Quotes at start/end become underscores, then leading underscore preserved
      expect(pathToTableName(["'data'"])).toBe('_data');
      expect(pathToTableName(['`table`'])).toBe('_table');
    });

    it('should sanitize SQL keywords-like names', () => {
      expect(pathToTableName(['select'])).toBe('select');
      expect(pathToTableName(['from'])).toBe('from');
      expect(pathToTableName(['where'])).toBe('where');
    });
  });

  describe('number handling', () => {
    it('should handle names starting with numbers', () => {
      expect(pathToTableName(['2024users'])).toBe('_2024users');
      expect(pathToTableName(['123data'])).toBe('_123data');
    });

    it('should handle all-number names', () => {
      expect(pathToTableName(['2024'])).toBe('_2024');
      expect(pathToTableName(['123'])).toBe('_123');
    });

    it('should handle multiple segments starting with numbers', () => {
      expect(pathToTableName(['2024data', '123items'])).toBe('_2024data__123items');
    });
  });

  describe('underscore handling', () => {
    it('should remove consecutive underscores', () => {
      expect(pathToTableName(['user__data'])).toBe('user_data');
      expect(pathToTableName(['my___table'])).toBe('my_table');
    });

    it('should remove trailing underscores', () => {
      expect(pathToTableName(['user_'])).toBe('user');
      expect(pathToTableName(['data___'])).toBe('data');
    });

    it('should preserve leading underscores', () => {
      expect(pathToTableName(['_users'])).toBe('_users');
      expect(pathToTableName(['__data'])).toBe('_data'); // Consecutive underscores are removed
    });
  });

  describe('case handling', () => {
    it('should convert to lowercase', () => {
      expect(pathToTableName(['Users'])).toBe('users');
      expect(pathToTableName(['MyTable'])).toBe('mytable');
    });

    it('should convert camelCase to lowercase', () => {
      expect(pathToTableName(['myTableData'])).toBe('mytabledata');
      expect(pathToTableName(['firstName'])).toBe('firstname');
    });

    it('should convert PascalCase to lowercase', () => {
      expect(pathToTableName(['UserData'])).toBe('userdata');
      expect(pathToTableName(['OrderItems'])).toBe('orderitems');
    });
  });

  describe('empty and edge cases', () => {
    it('should throw on empty path', () => {
      expect(() => pathToTableName([])).toThrow('Path cannot be empty');
    });

    it('should handle empty string segments', () => {
      expect(pathToTableName([''])).toBe('table_data');
    });

    it('should handle all-special-char segments', () => {
      expect(pathToTableName(['@#$%'])).toBe('table_data');
      expect(pathToTableName(['!!!'])).toBe('table_data');
    });

    it('should handle very long names', () => {
      const longName = 'a'.repeat(100);
      expect(pathToTableName([longName])).toBe(longName);
    });
  });
});
