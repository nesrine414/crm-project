import { ComponentFixture, TestBed } from '@angular/core/testing';

import { NonConformites } from './non-conformites';

describe('NonConformites', () => {
  let component: NonConformites;
  let fixture: ComponentFixture<NonConformites>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [NonConformites],
    }).compileComponents();

    fixture = TestBed.createComponent(NonConformites);
    component = fixture.componentInstance;
    await fixture.whenStable();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
