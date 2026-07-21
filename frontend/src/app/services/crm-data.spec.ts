import { TestBed } from '@angular/core/testing';

import { CrmData } from './crm-data';

describe('CrmData', () => {
  let service: CrmData;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CrmData);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
